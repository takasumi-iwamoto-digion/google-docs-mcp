// src/markdownDetailedConverter.ts
import { docs_v1 } from 'googleapis';

export interface DetailedMarkdownOptions {
    includeMetadata?: boolean;
    includeStyles?: boolean;
    includeIds?: boolean;
    preserveAllFormatting?: boolean;
    // New options for selective metadata
    metadataOptions?: {
        includeRanges?: boolean;
        includeListInfo?: boolean;
        includeIndentInfo?: boolean;
        includeHeadingIds?: boolean;
        minimalMode?: boolean; // Only essential metadata
    };
}

export function convertDocsJsonToMarkdownDetailed(
    document: docs_v1.Schema$Document, 
    options: DetailedMarkdownOptions = {}
): string {
    const {
        includeMetadata = true,
        includeStyles = true,
        includeIds = true,
        preserveAllFormatting = true,
        metadataOptions = {}
    } = options;

    // Default metadata options
    const metaOpts = {
        includeRanges: metadataOptions.includeRanges ?? !metadataOptions.minimalMode,
        includeListInfo: metadataOptions.includeListInfo ?? true,
        includeIndentInfo: metadataOptions.includeIndentInfo ?? !metadataOptions.minimalMode,
        includeHeadingIds: metadataOptions.includeHeadingIds ?? true,
        minimalMode: metadataOptions.minimalMode ?? false
    };

    let markdown = '';
    
    // Add frontmatter with document metadata
    if (includeMetadata && document.documentId) {
        markdown += '---\n';
        markdown += `documentId: ${document.documentId}\n`;
        markdown += `title: ${document.title || 'Untitled'}\n`;
        markdown += `revisionId: ${document.revisionId || 'unknown'}\n`;
        if (document.documentStyle) {
            markdown += `pageSize: ${JSON.stringify(document.documentStyle.pageSize)}\n`;
            // Note: margin might not be available in the current API version
            // markdown += `margins: ${JSON.stringify(document.documentStyle.margin)}\n`;
        }
        markdown += '---\n\n';
    }
    
    // Process document title
    if (document.title) {
        markdown += `# ${document.title}\n`;
        if (includeMetadata) {
            markdown += `<!-- document-title -->\n`;
        }
        markdown += '\n';
    }

    // Process each content element
    if (document.body?.content) {
        for (const element of document.body.content) {
            if (element.paragraph) {
                markdown += processDetailedParagraph(element.paragraph, element.startIndex || undefined, element.endIndex || undefined, options, metaOpts) + '\n';
            } else if (element.table) {
                markdown += processDetailedTable(element.table, element.startIndex || undefined, element.endIndex || undefined, options) + '\n';
            } else if (element.sectionBreak) {
                markdown += processDetailedSectionBreak(element.sectionBreak, element.startIndex || undefined, element.endIndex || undefined, options) + '\n';
            } else if (element.tableOfContents) {
                markdown += processTableOfContents(element.tableOfContents, options) + '\n';
            }
        }
    }

    // Clean up excessive newlines
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
    
    return markdown;
}

function processDetailedParagraph(
    paragraph: docs_v1.Schema$Paragraph,
    startIndex?: number,
    endIndex?: number,
    options: DetailedMarkdownOptions = {},
    metaOpts: any = {}
): string {
    if (!paragraph.elements) {
        return '';
    }

    let paragraphText = '';
    const metadata: any = {};
    
    // Collect metadata based on options
    if (options.includeIds && metaOpts.includeHeadingIds && paragraph.paragraphStyle?.headingId) {
        metadata.headingId = paragraph.paragraphStyle.headingId;
    }
    
    if (options.includeStyles && metaOpts.includeIndentInfo && paragraph.paragraphStyle) {
        const style = paragraph.paragraphStyle;
        if (style.indentFirstLine || style.indentStart || style.indentEnd) {
            metadata.indent = {
                firstLine: style.indentFirstLine?.magnitude,
                start: style.indentStart?.magnitude,
                end: style.indentEnd?.magnitude
            };
        }
        if (!metaOpts.minimalMode) {
            if (style.spaceAbove || style.spaceBelow) {
                metadata.spacing = {
                    above: style.spaceAbove?.magnitude,
                    below: style.spaceBelow?.magnitude
                };
            }
            if (style.alignment) {
                metadata.alignment = style.alignment;
            }
            if (style.lineSpacing) {
                metadata.lineSpacing = style.lineSpacing;
            }
        }
    }
    
    if (options.includeMetadata && metaOpts.includeRanges && (startIndex !== undefined || endIndex !== undefined)) {
        metadata.range = { start: startIndex, end: endIndex };
    }

    // Collect all text runs with detailed formatting
    const textRuns: Array<{text: string, style?: any}> = [];
    for (const element of paragraph.elements) {
        if (element.textRun) {
            const processedText = processDetailedTextRun(element.textRun, options);
            textRuns.push({
                text: processedText,
                style: options.includeStyles ? element.textRun.textStyle : undefined
            });
        } else if (element.inlineObjectElement) {
            textRuns.push({
                text: `<!-- inline-object: ${element.inlineObjectElement.inlineObjectId} -->`,
                style: undefined
            });
        } else if (element.horizontalRule) {
            textRuns.push({
                text: '---',
                style: undefined
            });
        } else if (element.richLink) {
            // Process rich links (embedded Google Docs links)
            const richLink = element.richLink;
            if (richLink.richLinkProperties) {
                const props = richLink.richLinkProperties;
                let linkText = `[${props.title || 'Google Docs Link'}](${props.uri || '#'})`;
                
                if (options.includeMetadata && !metaOpts.minimalMode) {
                    const metadata = {
                        richLinkId: richLink.richLinkId,
                        mimeType: props.mimeType,
                        uri: props.uri
                    };
                    linkText += `\n<!-- rich-link: ${JSON.stringify(metadata)} -->`;
                }
                
                textRuns.push({
                    text: linkText,
                    style: undefined
                });
            }
        }
    }

    // Combine text runs
    paragraphText = textRuns.map(run => run.text).join('');

    // Apply paragraph-level formatting
    const namedStyle = paragraph.paragraphStyle?.namedStyleType;
    let formattedText = paragraphText;
    
    if (namedStyle === 'HEADING_1') {
        formattedText = `# ${paragraphText}`;
    } else if (namedStyle === 'HEADING_2') {
        formattedText = `## ${paragraphText}`;
    } else if (namedStyle === 'HEADING_3') {
        formattedText = `### ${paragraphText}`;
    } else if (namedStyle === 'HEADING_4') {
        formattedText = `#### ${paragraphText}`;
    } else if (namedStyle === 'HEADING_5') {
        formattedText = `##### ${paragraphText}`;
    } else if (namedStyle === 'HEADING_6') {
        formattedText = `###### ${paragraphText}`;
    }

    // Handle lists with detailed information
    if (paragraph.bullet) {
        const indent = getDetailedIndentLevel(paragraph);
        const indentString = '  '.repeat(indent.level);
        
        if (paragraph.bullet.listId && metaOpts.includeListInfo) {
            if (options.includeMetadata) {
                metadata.listId = paragraph.bullet.listId;
                if (!metaOpts.minimalMode) {
                    metadata.nestingLevel = paragraph.bullet.nestingLevel;
                }
            }
            
            // Check if it's ordered or unordered
            const listProperties = paragraph.bullet.textStyle;
            if (listProperties || paragraph.paragraphStyle?.namedStyleType?.includes('NUMBERED')) {
                formattedText = `${indentString}1. ${paragraphText}`;
            } else {
                formattedText = `${indentString}- ${paragraphText}`;
            }
        } else {
            formattedText = `${indentString}- ${paragraphText}`;
        }
    }

    // Add metadata as HTML comment if needed
    if (options.includeMetadata && Object.keys(metadata).length > 0) {
        formattedText += `\n<!-- paragraph-metadata: ${JSON.stringify(metadata)} -->`;
    }

    return formattedText;
}

function processDetailedTextRun(textRun: docs_v1.Schema$TextRun, options: DetailedMarkdownOptions = {}): string {
    if (!textRun.content) {
        return '';
    }

    let text = textRun.content;
    const style = textRun.textStyle;

    if (!style || !options.preserveAllFormatting) {
        return text;
    }

    // Collect style attributes
    const styleAttributes: string[] = [];
    
    // Basic formatting
    if (style.bold && style.italic) {
        text = `***${text}***`;
    } else if (style.bold) {
        text = `**${text}**`;
    } else if (style.italic) {
        text = `*${text}*`;
    }

    if (style.strikethrough) {
        text = `~~${text}~~`;
    }

    // Extended formatting using HTML
    if (options.includeStyles) {
        if (style.underline && !style.link) {
            text = `<u>${text}</u>`;
        }

        // Font size
        if (style.fontSize?.magnitude) {
            styleAttributes.push(`font-size:${style.fontSize.magnitude}pt`);
        }

        // Font family
        if (style.weightedFontFamily?.fontFamily) {
            styleAttributes.push(`font-family:'${style.weightedFontFamily.fontFamily}'`);
        }

        // Colors
        if (style.foregroundColor?.color?.rgbColor) {
            const color = style.foregroundColor.color.rgbColor;
            const hex = rgbToHex(color);
            styleAttributes.push(`color:${hex}`);
        }

        if (style.backgroundColor?.color?.rgbColor) {
            const color = style.backgroundColor.color.rgbColor;
            const hex = rgbToHex(color);
            styleAttributes.push(`background-color:${hex}`);
        }

        // Baseline offset
        if (style.baselineOffset) {
            if (style.baselineOffset === 'SUPERSCRIPT') {
                text = `<sup>${text}</sup>`;
            } else if (style.baselineOffset === 'SUBSCRIPT') {
                text = `<sub>${text}</sub>`;
            }
        }
    }

    // Apply inline styles if any
    if (styleAttributes.length > 0 && options.includeStyles) {
        text = `<span style="${styleAttributes.join(';')}">${text}</span>`;
    }

    // Handle links
    if (style.link?.url) {
        text = `[${text}](${style.link.url})`;
        if (options.includeMetadata && style.link.headingId) {
            text += `<!-- link-heading: ${style.link.headingId} -->`;
        }
    }

    return text;
}

function processDetailedTable(
    table: docs_v1.Schema$Table,
    startIndex?: number,
    endIndex?: number,
    options: DetailedMarkdownOptions = {}
): string {
    if (!table.tableRows || table.tableRows.length === 0) {
        return '';
    }

    let markdown = '';
    
    // Add table metadata
    if (options.includeMetadata && !options.metadataOptions?.minimalMode) {
        const metadata: any = {
            rows: table.rows,
            columns: table.columns,
            range: { start: startIndex, end: endIndex }
        };
        
        if (table.tableStyle) {
            metadata.style = {
                tableColumnProperties: table.tableStyle.tableColumnProperties
            };
        }
        
        markdown += `<!-- table-metadata: ${JSON.stringify(metadata)} -->\n`;
    }
    
    const rows = table.tableRows;
    
    // Process each row
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.tableCells) continue;

        let rowMarkdown = '|';
        
        // Process each cell
        for (let j = 0; j < row.tableCells.length; j++) {
            const cell = row.tableCells[j];
            const cellText = extractDetailedCellText(cell, options);
            
            // Add cell metadata if needed
            if (options.includeMetadata && !options.metadataOptions?.minimalMode && cell.tableCellStyle) {
                const cellMeta = {
                    row: i,
                    col: j,
                    rowSpan: cell.tableCellStyle.rowSpan,
                    columnSpan: cell.tableCellStyle.columnSpan,
                    backgroundColor: cell.tableCellStyle.backgroundColor
                };
                rowMarkdown += ` ${cellText} <!-- cell: ${JSON.stringify(cellMeta)} --> |`;
            } else {
                rowMarkdown += ` ${cellText} |`;
            }
        }
        
        markdown += rowMarkdown + '\n';
        
        // Add header separator after first row
        if (i === 0) {
            let separator = '|';
            for (let j = 0; j < row.tableCells.length; j++) {
                separator += ' --- |';
            }
            markdown += separator + '\n';
        }
    }

    return markdown;
}

function extractDetailedCellText(cell: docs_v1.Schema$TableCell, options: DetailedMarkdownOptions = {}): string {
    if (!cell.content) {
        return '';
    }

    let cellText = '';
    
    for (const element of cell.content) {
        if (element.paragraph) {
            const paragraphText = processDetailedParagraph(element.paragraph, undefined, undefined, {
                ...options,
                includeMetadata: false // Don't include metadata within cells
            });
            cellText += paragraphText + ' ';
        }
    }

    return cellText.trim();
}

function processDetailedSectionBreak(
    sectionBreak: docs_v1.Schema$SectionBreak,
    startIndex?: number,
    endIndex?: number,
    options: DetailedMarkdownOptions = {}
): string {
    let markdown = '\n---\n';
    
    if (options.includeMetadata && !options.metadataOptions?.minimalMode && sectionBreak.sectionStyle) {
        const metadata = {
            sectionType: sectionBreak.sectionStyle.sectionType,
            columnSeparatorStyle: sectionBreak.sectionStyle.columnSeparatorStyle,
            contentDirection: sectionBreak.sectionStyle.contentDirection,
            marginHeader: sectionBreak.sectionStyle.marginHeader,
            marginFooter: sectionBreak.sectionStyle.marginFooter,
            range: { start: startIndex, end: endIndex }
        };
        markdown += `<!-- section-break: ${JSON.stringify(metadata)} -->\n`;
    }
    
    return markdown;
}

function processTableOfContents(toc: docs_v1.Schema$TableOfContents, options: DetailedMarkdownOptions = {}): string {
    let markdown = '\n## Table of Contents\n\n';
    
    if (options.includeMetadata && toc.content) {
        markdown += `<!-- toc-metadata: ${JSON.stringify({ suggestedInsertionIds: toc.suggestedInsertionIds })} -->\n`;
    }
    
    // Note: Actual TOC content would need to be generated from headings
    markdown += '<!-- TOC content would be generated here -->\n';
    
    return markdown;
}

function getDetailedIndentLevel(paragraph: docs_v1.Schema$Paragraph): { level: number, exact?: number } {
    const indentStart = paragraph.paragraphStyle?.indentStart?.magnitude || 0;
    const indentFirstLine = paragraph.paragraphStyle?.indentFirstLine?.magnitude || 0;
    const totalIndent = Math.max(indentStart, indentFirstLine);
    
    // More precise calculation
    const level = Math.floor(totalIndent / 36);
    
    return { level, exact: totalIndent };
}

function rgbToHex(rgbColor: docs_v1.Schema$RgbColor): string {
    const r = Math.round((rgbColor.red || 0) * 255);
    const g = Math.round((rgbColor.green || 0) * 255);
    const b = Math.round((rgbColor.blue || 0) * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Export a simplified version that uses all detailed options by default
export function convertDocsJsonToMarkdownWithAllDetails(document: docs_v1.Schema$Document): string {
    return convertDocsJsonToMarkdownDetailed(document, {
        includeMetadata: true,
        includeStyles: true,
        includeIds: true,
        preserveAllFormatting: true
    });
}

// Export minimal metadata version (no listId, no headingId)
export function convertDocsJsonToMarkdownMinimal(document: docs_v1.Schema$Document): string {
    return convertDocsJsonToMarkdownDetailed(document, {
        includeMetadata: true,
        includeStyles: true,
        includeIds: false,  // This disables headingId
        preserveAllFormatting: true,
        metadataOptions: {
            minimalMode: true,
            includeListInfo: false,  // This disables listId
            includeHeadingIds: false
        }
    });
}