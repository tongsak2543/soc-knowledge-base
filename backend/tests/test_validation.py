import pytest
from app.services.validator import validate_and_normalize_ioc, defang


def test_defang_helper():
    assert defang("192[.]168[.]1[.]1") == "192.168.1.1"
    assert defang("hxxps://evil[.]com/bad") == "https://evil.com/bad"
    assert defang("bad-domain(.)org") == "bad-domain.org"


def test_ipv4_validation():
    ok, norm, err = validate_and_normalize_ioc("IPv4", "192.168.1.100")
    assert ok is True
    assert norm == "192.168.1.100"

    # Defanged IPv4
    ok, norm, err = validate_and_normalize_ioc("IPv4", "10[.]0[.]0[.]1")
    assert ok is True
    assert norm == "10.0.0.1"

    # Invalid IPv4
    ok, norm, err = validate_and_normalize_ioc("IPv4", "999.999.999.999")
    assert ok is False
    assert "not a valid IPv4" in err


def test_ipv6_validation():
    ok, norm, err = validate_and_normalize_ioc("IPv6", "2001:0db8:85a3:0000:0000:8a2e:0370:7334")
    assert ok is True

    ok, norm, err = validate_and_normalize_ioc("IPv6", "invalid:ipv6:here")
    assert ok is False


def test_domain_validation():
    ok, norm, err = validate_and_normalize_ioc("Domain", "evil-c2[.]xyz")
    assert ok is True
    assert norm == "evil-c2.xyz"

    ok, norm, err = validate_and_normalize_ioc("Domain", "https://malicious.com/")
    assert ok is True
    assert norm == "malicious.com"

    ok, norm, err = validate_and_normalize_ioc("Domain", "not_a_valid_domain")
    assert ok is False


def test_hash_validations():
    # MD5
    ok, norm, err = validate_and_normalize_ioc("MD5", "5D41402ABC4B2A76B9719D911017C592")
    assert ok is True
    assert norm == "5d41402abc4b2a76b9719d911017c592"

    # SHA1
    ok, norm, err = validate_and_normalize_ioc("SHA1", "2FD4E1C67A2D28FCED849EE1BB76E7391B93EB12")
    assert ok is True
    assert norm == "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12"

    # SHA256
    ok, norm, err = validate_and_normalize_ioc(
        "SHA256",
        "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    )
    assert ok is True
    assert norm == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    # Short hash error
    ok, norm, err = validate_and_normalize_ioc("SHA256", "tooshort")
    assert ok is False

