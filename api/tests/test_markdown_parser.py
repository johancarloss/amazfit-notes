from src.services.markdown_parser import MarkdownParser


def test_headings():
    parser = MarkdownParser()
    blocks, truncated = parser.parse("# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6")

    assert not truncated
    types = [b.type.value for b in blocks]
    assert types == ["h1", "h2", "h3", "h4", "h5", "h6"]
    assert blocks[0].text == "H1"
    assert blocks[5].text == "H6"


def test_paragraph():
    parser = MarkdownParser()
    blocks, _ = parser.parse("Simple paragraph text.\n\nAnother paragraph.")

    paragraphs = [b for b in blocks if b.type.value == "paragraph"]
    assert len(paragraphs) == 2
    assert paragraphs[0].text == "Simple paragraph text."


def test_inline_formatting():
    parser = MarkdownParser()
    blocks, _ = parser.parse("**bold** and *italic* and `code` and ~~strike~~")

    types = [b.type.value for b in blocks]
    assert "bold" in types
    assert "italic" in types
    assert "code_inline" in types
    # bold text preserved
    bold_blocks = [b for b in blocks if b.type.value == "bold"]
    assert bold_blocks[0].text == "bold"
    # code preserved
    code_blocks = [b for b in blocks if b.type.value == "code_inline"]
    assert code_blocks[0].text == "code"


def test_link_stripping():
    parser = MarkdownParser()
    blocks, _ = parser.parse("[Obsidian](https://obsidian.md) is great")

    assert blocks[0].text == "Obsidian is great"


def test_unordered_list():
    parser = MarkdownParser()
    blocks, _ = parser.parse("- Item A\n- Item B\n- Item C")

    ul_blocks = [b for b in blocks if b.type.value == "ul"]
    assert len(ul_blocks) == 3
    assert ul_blocks[0].text == "Item A"
    assert all(b.indent == 0 for b in ul_blocks)


def test_nested_list():
    parser = MarkdownParser()
    blocks, _ = parser.parse("- Parent\n  - Child\n  - Child 2\n- Parent 2")

    assert blocks[0].indent == 0
    assert blocks[0].text == "Parent"
    assert blocks[1].indent == 1
    assert blocks[1].text == "Child"
    assert blocks[3].indent == 0


def test_ordered_list():
    parser = MarkdownParser()
    blocks, _ = parser.parse("1. First\n2. Second\n3. Third")

    ol_blocks = [b for b in blocks if b.type.value == "ol"]
    assert len(ol_blocks) == 3
    assert ol_blocks[0].text == "1. First"
    assert ol_blocks[2].text == "3. Third"


def test_checkboxes():
    parser = MarkdownParser()
    blocks, _ = parser.parse("- [x] Done\n- [ ] Pending")

    assert blocks[0].type.value == "checkbox_checked"
    assert blocks[0].text == "Done"
    assert blocks[1].type.value == "checkbox_unchecked"
    assert blocks[1].text == "Pending"


def test_code_block():
    parser = MarkdownParser()
    blocks, _ = parser.parse("```python\nprint('hello')\n```")

    code = [b for b in blocks if b.type.value == "code_block"]
    assert len(code) == 1
    assert code[0].text == "print('hello')"
    assert code[0].language == "python"


def test_blockquote():
    parser = MarkdownParser()
    blocks, _ = parser.parse("> Quote text here")

    bq = [b for b in blocks if b.type.value == "blockquote"]
    assert len(bq) == 1
    assert bq[0].text == "Quote text here"
    assert bq[0].indent == 0


def test_nested_blockquote():
    parser = MarkdownParser()
    blocks, _ = parser.parse("> Outer\n> > Inner")

    bq = [b for b in blocks if b.type.value == "blockquote"]
    assert len(bq) == 2
    assert bq[0].indent == 0
    assert bq[1].indent == 1


def test_horizontal_rule():
    parser = MarkdownParser()
    blocks, _ = parser.parse("---")

    hr = [b for b in blocks if b.type.value == "hr"]
    assert len(hr) == 1


def test_table():
    parser = MarkdownParser()
    blocks, _ = parser.parse("| A | B |\n|---|---|\n| 1 | 2 |")

    table_blocks = [b for b in blocks if b.type.value == "table"]
    assert len(table_blocks) == 2  # header + 1 row
    assert "A" in table_blocks[0].text
    assert "1" in table_blocks[1].text


def test_truncation():
    parser = MarkdownParser()
    md = "\n\n".join([f"Paragraph {i}" for i in range(300)])
    blocks, truncated = parser.parse(md, max_blocks=10)

    assert truncated
    assert len(blocks) == 10


def test_real_diary_format():
    """Test with actual diary-style markdown."""
    parser = MarkdownParser()
    md = """# Diario - 2026-03-15

## Projeto: Agente Imobiliario

### 23:56 - Refatoracao

**Contexto**: Continuacao da feature.

**Implementacoes**:
- Novo sub-workflow
- Workflow principal atualizado

**Problemas -> Solucoes**:
- Sub-workflow sem ID: placeholder + importacao manual

**Commits**:
- `8bf009a` feat(db): add department_contacts

**Proximos Passos**:
- [ ] Push + PR
- [x] Testar com mensagem real

---
"""
    blocks, truncated = parser.parse(md)

    assert not truncated
    types = [b.type.value for b in blocks]

    assert "h1" in types
    assert "h2" in types
    assert "h3" in types
    assert "paragraph" in types
    assert "ul" in types
    assert "checkbox_unchecked" in types
    assert "checkbox_checked" in types
    assert "hr" in types
