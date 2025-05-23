class AuthenticationError(Exception):
    """Raised when authentication fails"""
    pass

class IneligibleError(Exception):
    """Raised when user is not eligible for downloads"""
    pass

class InvalidAppIdError(Exception):
    """Raised when an invalid app ID is used"""
    pass

class InvalidAppSecretError(Exception):
    """Raised when an invalid app secret is used"""
    pass

class InvalidQuality(Exception):
    """Raised when an invalid quality ID is specified"""
    pass
