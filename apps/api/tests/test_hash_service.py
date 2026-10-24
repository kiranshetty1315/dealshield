from app.services.hash_service import HashService


def test_hash_text_deterministic():
    text = "Agreement between Raj Mehta and Priya Sharma for ₹1,00,000"
    hash_1 = HashService.hash_text(text)
    hash_2 = HashService.hash_text(text)
    assert hash_1 == hash_2
    assert len(hash_1) == 64  # SHA-256 is 64 hex characters


def test_verify_integrity():
    text = "Terms: 50% upfront, delivery by end of April."
    digest = HashService.hash_text(text)

    # Valid check
    is_valid, reason = HashService.verify_integrity(text, digest)
    assert is_valid is True
    assert "Integrity verified" in reason

    # Modified content check
    modified = "Terms: 100% upfront, delivery by end of April."
    is_valid, reason = HashService.verify_integrity(modified, digest)
    assert is_valid is False
    assert "Hash mismatch" in reason


def test_create_document_hash_record():
    doc_id = "doc-uuid-1234"
    doc_type = "service_agreement"
    content = "Service agreement plain text content"
    record = HashService.create_document_hash_record(doc_id, doc_type, content)

    assert record.document_id == doc_id
    assert record.document_type == doc_type
    assert record.hash_algorithm == "sha256"
    assert record.hash_value == HashService.hash_text(content)
    assert "SHA-256 provides integrity verification" in record.limitations_notice
