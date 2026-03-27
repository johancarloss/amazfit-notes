from src.services.markdown_parser import MarkdownParser


def test_headings():
    parser = MarkdownParser()
    blocks = parser.parse("# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6")

    types = [b.type.value for b in blocks]
    assert types == ["h1", "h2", "h3", "h4", "h5", "h6"]
    assert blocks[0].text == "H1"
    assert blocks[5].text == "H6"


def test_paragraph():
    parser = MarkdownParser()
    blocks = parser.parse("Simple paragraph text.\n\nAnother paragraph.")

    paragraphs = [b for b in blocks if b.type.value == "paragraph"]
    assert len(paragraphs) == 2
    assert paragraphs[0].text == "Simple paragraph text."


def test_inline_formatting():
    parser = MarkdownParser()

    # Bold/italic inline stay in the same paragraph (no line break)
    blocks = parser.parse("Text with **bold** and *italic* here.")
    assert len(blocks) == 1
    assert blocks[0].type.value == "paragraph"
    assert "bold" in blocks[0].text
    assert "italic" in blocks[0].text

    # Standalone bold gets its own block type
    blocks = parser.parse("**All bold**")
    assert blocks[0].type.value == "bold"

    # Code inline splits into separate blocks (needs background)
    blocks = parser.parse("Use `git pull` to update.")
    types = [b.type.value for b in blocks]
    assert "code_inline" in types
    code_blocks = [b for b in blocks if b.type.value == "code_inline"]
    assert code_blocks[0].text == "git pull"


def test_link_stripping():
    parser = MarkdownParser()
    blocks = parser.parse("[Obsidian](https://obsidian.md) is great")

    assert blocks[0].text == "Obsidian is great"


def test_unordered_list():
    parser = MarkdownParser()
    blocks = parser.parse("- Item A\n- Item B\n- Item C")

    ul_blocks = [b for b in blocks if b.type.value == "ul"]
    assert len(ul_blocks) == 3
    assert ul_blocks[0].text == "Item A"
    assert all(b.indent == 0 for b in ul_blocks)


def test_nested_list():
    parser = MarkdownParser()
    blocks = parser.parse("- Parent\n  - Child\n  - Child 2\n- Parent 2")

    assert blocks[0].indent == 0
    assert blocks[0].text == "Parent"
    assert blocks[1].indent == 1
    assert blocks[1].text == "Child"
    assert blocks[3].indent == 0


def test_ordered_list():
    parser = MarkdownParser()
    blocks = parser.parse("1. First\n2. Second\n3. Third")

    ol_blocks = [b for b in blocks if b.type.value == "ol"]
    assert len(ol_blocks) == 3
    assert ol_blocks[0].text == "1. First"
    assert ol_blocks[2].text == "3. Third"


def test_checkboxes():
    parser = MarkdownParser()
    blocks = parser.parse("- [x] Done\n- [ ] Pending")

    assert blocks[0].type.value == "checkbox_checked"
    assert blocks[0].text == "Done"
    assert blocks[1].type.value == "checkbox_unchecked"
    assert blocks[1].text == "Pending"


def test_code_block():
    parser = MarkdownParser()
    blocks = parser.parse("```python\nprint('hello')\n```")

    code = [b for b in blocks if b.type.value == "code_block"]
    assert len(code) == 1
    assert code[0].text == "print('hello')"
    assert code[0].language == "python"


def test_blockquote():
    parser = MarkdownParser()
    blocks = parser.parse("> Quote text here")

    bq = [b for b in blocks if b.type.value == "blockquote"]
    assert len(bq) == 1
    assert bq[0].text == "Quote text here"
    assert bq[0].indent == 0


def test_nested_blockquote():
    parser = MarkdownParser()
    blocks = parser.parse("> Outer\n> > Inner")

    bq = [b for b in blocks if b.type.value == "blockquote"]
    assert len(bq) == 2
    assert bq[0].indent == 0
    assert bq[1].indent == 1


def test_horizontal_rule():
    parser = MarkdownParser()
    blocks = parser.parse("---")

    hr = [b for b in blocks if b.type.value == "hr"]
    assert len(hr) == 1


def test_table():
    parser = MarkdownParser()
    blocks = parser.parse("| A | B |\n|---|---|\n| 1 | 2 |")

    table_blocks = [b for b in blocks if b.type.value == "table"]
    assert len(table_blocks) == 1  # 1 data row as card
    assert "A: 1" in table_blocks[0].text
    assert "B: 2" in table_blocks[0].text


def test_large_document():
    parser = MarkdownParser()
    md = "\n\n".join([f"Paragraph {i}" for i in range(300)])
    blocks = parser.parse(md)

    assert len(blocks) == 300


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
    blocks = parser.parse(md)

    types = [b.type.value for b in blocks]

    assert "h1" in types
    assert "h2" in types
    assert "h3" in types
    assert "paragraph" in types
    assert "ul" in types
    assert "checkbox_unchecked" in types
    assert "checkbox_checked" in types
    assert "hr" in types
