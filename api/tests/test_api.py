def test_health(client, auth_headers):
    response = client.get("/api/v1/health", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["vault_ok"] is True


def test_health_requires_auth(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 422


def test_folders_requires_auth(client):
    response = client.get("/api/v1/folders")
    assert response.status_code == 422


def test_folders_invalid_key(client):
    response = client.get("/api/v1/folders", headers={"X-API-Key": "wrong"})
    assert response.status_code == 401


def test_list_root_folders(client, auth_headers):
    response = client.get("/api/v1/folders", headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    names = [item["name"] for item in data["items"]]
    assert "Watch" in names


def test_list_watch_folder(client, auth_headers):
    response = client.get("/api/v1/folders/Watch", headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    assert data["path"] == "Watch"
    assert len(data["items"]) > 0


def test_list_disallowed_folder(client, auth_headers):
    response = client.get("/api/v1/folders/.git", headers=auth_headers)
    assert response.status_code == 403


def test_path_traversal_blocked(client, auth_headers):
    response = client.get("/api/v1/folders/Watch/../../etc", headers=auth_headers)
    assert response.status_code in (403, 404)


def test_get_note_blocks(client, auth_headers):
    response = client.get(
        "/api/v1/notes/Watch/exemplo-formatacao.md",
        headers=auth_headers,
    )
    assert response.status_code == 200

    data = response.json()
    assert data["title"] == "Exemplo de Formatacao"
    assert data["block_count"] > 0
    assert data["total_blocks"] > 0
    assert "offset" in data
    assert "limit" in data

    types = {b["type"] for b in data["blocks"]}
    assert "h1" in types


def test_get_note_not_found(client, auth_headers):
    response = client.get(
        "/api/v1/notes/Watch/nonexistent.md",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_pagination(client, auth_headers):
    response = client.get(
        "/api/v1/notes/Watch/exemplo-formatacao.md?offset=0&limit=5",
        headers=auth_headers,
    )
    assert response.status_code == 200

    data = response.json()
    assert data["block_count"] == 5
    assert data["offset"] == 0
    assert data["limit"] == 5
    assert data["has_more"] is True
    assert data["total_blocks"] > 5


def test_pagination_offset(client, auth_headers):
    response = client.get(
        "/api/v1/notes/Watch/exemplo-formatacao.md?offset=5&limit=5",
        headers=auth_headers,
    )
    assert response.status_code == 200

    data = response.json()
    assert data["offset"] == 5


def test_pagination_beyond_end(client, auth_headers):
    response = client.get(
        "/api/v1/notes/Watch/exemplo-formatacao.md?offset=9999&limit=25",
        headers=auth_headers,
    )
    assert response.status_code == 200

    data = response.json()
    assert data["block_count"] == 0
    assert data["has_more"] is False
