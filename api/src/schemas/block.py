from enum import Enum

from pydantic import BaseModel


class BlockType(str, Enum):
    HEADING_1 = "h1"
    HEADING_2 = "h2"
    HEADING_3 = "h3"
    HEADING_4 = "h4"
    HEADING_5 = "h5"
    HEADING_6 = "h6"
    PARAGRAPH = "paragraph"
    UNORDERED_LIST = "ul"
    ORDERED_LIST = "ol"
    CHECKBOX_CHECKED = "checkbox_checked"
    CHECKBOX_UNCHECKED = "checkbox_unchecked"
    CODE_BLOCK = "code_block"
    CODE_INLINE = "code_inline"
    BOLD = "bold"
    ITALIC = "italic"
    STRIKETHROUGH = "strikethrough"
    BLOCKQUOTE = "blockquote"
    HORIZONTAL_RULE = "hr"
    TABLE = "table"


class MarkdownBlock(BaseModel):
    type: BlockType
    text: str
    indent: int = 0
    language: str = ""


class NoteBlocksResponse(BaseModel):
    path: str
    title: str
    block_count: int
    total_blocks: int
    blocks: list[MarkdownBlock]
    has_more: bool = False
    offset: int = 0
    limit: int = 25
