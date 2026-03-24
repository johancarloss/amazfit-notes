import mistune

from src.schemas.block import BlockType, MarkdownBlock

_HEADING_MAP = {
    1: BlockType.HEADING_1,
    2: BlockType.HEADING_2,
    3: BlockType.HEADING_3,
    4: BlockType.HEADING_4,
    5: BlockType.HEADING_5,
    6: BlockType.HEADING_6,
}


class MarkdownParser:
    def __init__(self) -> None:
        self._markdown = mistune.create_markdown(
            renderer=None,  # None = returns AST (mistune 3.x)
            plugins=["strikethrough", "table", "task_lists"],
        )

    def parse(
        self, content: str, max_blocks: int = 200
    ) -> tuple[list[MarkdownBlock], bool]:
        """Parse markdown into flat list of blocks.

        Returns (blocks, truncated).
        """
        ast_tokens = self._markdown(content)
        blocks: list[MarkdownBlock] = []

        for token in ast_tokens:
            blocks.extend(self._convert_token(token, indent=0))
            if len(blocks) >= max_blocks:
                return blocks[:max_blocks], True

        return blocks, False

    def _convert_token(
        self, token: dict, indent: int = 0
    ) -> list[MarkdownBlock]:
        """Convert a mistune AST token to one or more blocks."""
        token_type = token.get("type", "")

        if token_type == "heading":
            level = token.get("attrs", {}).get("level", 1)
            block_type = _HEADING_MAP.get(level, BlockType.HEADING_6)
            text = self._extract_text(token.get("children", []))
            return [MarkdownBlock(type=block_type, text=text, indent=indent)]

        if token_type == "paragraph":
            return self._convert_paragraph(token.get("children", []), indent)

        if token_type == "list":
            ordered = token.get("attrs", {}).get("ordered", False)
            return self._convert_list(token, indent, ordered)

        if token_type == "block_code":
            raw = token.get("raw", "").rstrip("\n")
            language = token.get("attrs", {}).get("info", "") or ""
            return [
                MarkdownBlock(
                    type=BlockType.CODE_BLOCK,
                    text=raw,
                    indent=indent,
                    language=language,
                )
            ]

        if token_type == "block_quote":
            return self._convert_blockquote(token, indent)

        if token_type == "thematic_break":
            return [MarkdownBlock(type=BlockType.HORIZONTAL_RULE, text="", indent=indent)]

        if token_type == "table":
            return self._convert_table(token)

        # Skip blank_line and unknown tokens
        return []

    def _convert_list(
        self, token: dict, indent: int, ordered: bool
    ) -> list[MarkdownBlock]:
        """Convert list token with nested support."""
        blocks: list[MarkdownBlock] = []

        for i, item in enumerate(token.get("children", [])):
            item_type = item.get("type", "")
            children = item.get("children", [])
            attrs = item.get("attrs", {})

            # Task list items have type "task_list_item" in mistune 3.x
            if item_type == "task_list_item":
                checked = attrs.get("checked", False)
                text = self._extract_list_item_text(children)
                block_type = (
                    BlockType.CHECKBOX_CHECKED if checked else BlockType.CHECKBOX_UNCHECKED
                )
                blocks.append(MarkdownBlock(type=block_type, text=text, indent=indent))
            else:
                text = self._extract_list_item_text(children)
                if ordered:
                    text = f"{i + 1}. {text}"
                block_type = BlockType.ORDERED_LIST if ordered else BlockType.UNORDERED_LIST
                blocks.append(MarkdownBlock(type=block_type, text=text, indent=indent))

            # Nested lists in remaining children
            for child in children[1:]:
                if child.get("type") == "list":
                    nested_ordered = child.get("attrs", {}).get("ordered", False)
                    blocks.extend(self._convert_list(child, indent + 1, nested_ordered))

        return blocks

    def _convert_paragraph(
        self, children: list[dict], indent: int
    ) -> list[MarkdownBlock]:
        """Convert paragraph with inline formatting awareness.

        Splits paragraph into sub-blocks when it contains bold, italic,
        or inline code segments. This allows the watch to render each
        segment with its own visual style.
        """
        if not children:
            return []

        # If paragraph has only one child, check if it's a styled element
        if len(children) == 1:
            child = children[0]
            ctype = child.get("type", "")
            if ctype == "strong":
                text = self._extract_text(child.get("children", []))
                if text:
                    return [MarkdownBlock(type=BlockType.BOLD, text=text, indent=indent)]
            elif ctype == "emphasis":
                text = self._extract_text(child.get("children", []))
                if text:
                    return [MarkdownBlock(type=BlockType.ITALIC, text=text, indent=indent)]
            elif ctype == "codespan":
                text = child.get("raw", child.get("text", ""))
                if text:
                    return [MarkdownBlock(type=BlockType.CODE_INLINE, text=text, indent=indent)]
            elif ctype == "strikethrough":
                text = self._extract_text(child.get("children", []))
                if text:
                    return [MarkdownBlock(type=BlockType.STRIKETHROUGH, text=text, indent=indent)]

        # For mixed content, split into segments
        blocks: list[MarkdownBlock] = []
        current_text_parts: list[str] = []

        def flush_text():
            text = "".join(current_text_parts).strip()
            if text:
                blocks.append(MarkdownBlock(type=BlockType.PARAGRAPH, text=text, indent=indent))
            current_text_parts.clear()

        for child in children:
            ctype = child.get("type", "")

            if ctype == "codespan":
                flush_text()
                code = child.get("raw", child.get("text", ""))
                if code:
                    blocks.append(MarkdownBlock(type=BlockType.CODE_INLINE, text=code, indent=indent))
            elif ctype == "strong":
                flush_text()
                text = self._extract_text(child.get("children", []))
                if text:
                    blocks.append(MarkdownBlock(type=BlockType.BOLD, text=text, indent=indent))
            elif ctype == "emphasis":
                flush_text()
                text = self._extract_text(child.get("children", []))
                if text:
                    blocks.append(MarkdownBlock(type=BlockType.ITALIC, text=text, indent=indent))
            elif ctype == "strikethrough":
                flush_text()
                text = self._extract_text(child.get("children", []))
                if text:
                    blocks.append(MarkdownBlock(type=BlockType.STRIKETHROUGH, text=text, indent=indent))
            elif ctype in ("text", "raw"):
                current_text_parts.append(child.get("raw", child.get("text", "")))
            elif ctype == "softbreak":
                current_text_parts.append(" ")
            elif ctype == "linebreak":
                current_text_parts.append("\n")
            elif ctype == "link":
                current_text_parts.append(self._extract_text(child.get("children", [])))
            elif ctype == "image":
                alt = child.get("attrs", {}).get("alt", "")
                current_text_parts.append(f"[img: {alt}]" if alt else "[img]")
            elif "children" in child:
                current_text_parts.append(self._extract_text(child["children"]))
            else:
                current_text_parts.append(child.get("raw", ""))

        flush_text()

        return blocks

    def _extract_list_item_text(self, children: list[dict]) -> str:
        """Extract text from list item's first child (block_text or paragraph)."""
        if not children:
            return ""
        first = children[0]
        # mistune 3.x uses "block_text" for tight lists, "paragraph" for loose
        if first.get("type") in ("paragraph", "block_text"):
            return self._extract_text(first.get("children", []))
        return self._extract_text([first])

    def _convert_blockquote(
        self, token: dict, indent: int = 0
    ) -> list[MarkdownBlock]:
        """Convert blockquote with nesting support."""
        blocks: list[MarkdownBlock] = []

        for child in token.get("children", []):
            child_type = child.get("type", "")

            if child_type == "block_quote":
                blocks.extend(self._convert_blockquote(child, indent + 1))
            elif child_type == "paragraph":
                text = self._extract_text(child.get("children", []))
                blocks.append(
                    MarkdownBlock(type=BlockType.BLOCKQUOTE, text=text, indent=indent)
                )
            else:
                sub_blocks = self._convert_token(child, indent)
                for block in sub_blocks:
                    blocks.append(
                        MarkdownBlock(
                            type=BlockType.BLOCKQUOTE,
                            text=block.text,
                            indent=indent,
                        )
                    )

        return blocks

    def _convert_table(self, token: dict) -> list[MarkdownBlock]:
        """Convert table to simplified text rows.

        mistune 3.x structure:
        table -> table_head -> [table_cell, ...] (flat, no table_row)
        table -> table_body -> table_row -> [table_cell, ...]
        """
        blocks: list[MarkdownBlock] = []

        for child in token.get("children", []):
            child_type = child.get("type", "")

            if child_type == "table_head":
                # Head cells are direct children (no row wrapper)
                cells: list[str] = []
                for cell in child.get("children", []):
                    cells.append(self._extract_text(cell.get("children", [])))
                if cells:
                    blocks.append(
                        MarkdownBlock(type=BlockType.TABLE, text=" | ".join(cells))
                    )
                    blocks.append(
                        MarkdownBlock(type=BlockType.HORIZONTAL_RULE, text="")
                    )

            elif child_type == "table_body":
                for row in child.get("children", []):
                    cells = []
                    for cell in row.get("children", []):
                        cells.append(self._extract_text(cell.get("children", [])))
                    if cells:
                        blocks.append(
                            MarkdownBlock(type=BlockType.TABLE, text=" | ".join(cells))
                        )

        return blocks

    def _extract_text(self, children: list[dict]) -> str:
        """Recursively extract clean text from inline tokens.

        Strips markdown syntax (bold, italic, code, links) and keeps text content.
        """
        parts: list[str] = []

        for child in children:
            token_type = child.get("type", "")

            if token_type in ("text", "raw"):
                parts.append(child.get("raw", child.get("text", "")))

            elif token_type == "codespan":
                parts.append(child.get("raw", child.get("text", "")))

            elif token_type in ("strong", "emphasis", "strikethrough"):
                parts.append(self._extract_text(child.get("children", [])))

            elif token_type == "link":
                parts.append(self._extract_text(child.get("children", [])))

            elif token_type == "image":
                alt = child.get("attrs", {}).get("alt", "")
                parts.append(f"[img: {alt}]" if alt else "[img]")

            elif token_type == "softbreak":
                parts.append(" ")

            elif token_type == "linebreak":
                parts.append("\n")

            elif "children" in child:
                parts.append(self._extract_text(child["children"]))

        return "".join(parts)
