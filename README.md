# HiBeat - Music Download System

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)](https://www.python.org/)
[![Django](https://img.shields.io/badge/django-%3E%3D3.0-green)](https://www.djangoproject.com/)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/RaulAltamirano/HiBeat)](https://github.com/RaulAltamirano/HiBeat/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/RaulAltamirano/HiBeat)](https://github.com/RaulAltamirano/HiBeat/pulls)

HiBeat is a modern, scalable music download system built with Django that enables users to download high-quality music from streaming services. Currently, it supports Qobuz integration, allowing users to download music with full metadata and album art preservation.

> **Code Attribution Notice**: This project contains code inspired by or adapted from [vitiko98/qobuz-dl](https://github.com/vitiko98/qobuz-dl). We acknowledge and appreciate the original work by vitiko98.

## 🚀 Features

- 🎵 High-quality music downloads from Qobuz
- 📦 Full metadata preservation (artist, album, track info)
- 🎨 Album art download and management
- 🌐 RESTful API for system integration
- 🛠️ Modular architecture for easy extension
- 📊 Django admin interface for management
- 🔒 Secure authentication and authorization
- 🔄 Background task processing
- 📥 Batch download capabilities

## 📁 Project Structure

```
HiBeat/
├── core/              # Application core logic
│   ├── api/          # REST API endpoints
│   ├── models/       # Database models
│   ├── services/     # Business logic
│   │   └── qobuz/   # Qobuz-specific services
│   ├── utils/       # Utilities and helpers
│   ├── admin.py     # Django admin configuration
│   ├── apps.py      # Django app configuration
│   ├── exceptions.py # Custom exception classes
│   ├── serializers.py # API serializers
│   ├── tests.py     # Test cases
│   └── urls.py      # URL routing
├── HiBeat/           # Django project configuration
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── manage.py         # Django management script
├── requirements.txt  # Project dependencies
└── venv/             # Virtual environment
```

## 📋 Requirements

- Python 3.8 or higher
- Django 3.0 or higher
- Dependencies listed in [requirements.txt](requirements.txt)
- Qobuz premium account (for Qobuz functionality)
- PostgreSQL database (recommended)
- Redis (for background tasks)

## 🛠️ Installation

1. Clone the repository:
   ```bash
git clone https://github.com/RaulAltamirano/HiBeat.git
cd HiBeat
```

2. Create and activate virtual environment:
   ```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
   ```bash
pip install -r requirements.txt
```

4. Configure environment variables:
   Create a `.env` file in the project root with these variables:
   ```bash
QOBUZ_EMAIL=your@email.com
QOBUZ_PASSWORD=yourpassword
QOBUZ_APP_ID=your_app_id
DATABASE_URL=postgresql://user:password@localhost:5432/hibit
REDIS_URL=redis://localhost:6379/0
```

5. Run migrations:
   ```bash
python manage.py migrate
```

6. Start the development server:
   ```bash
python manage.py runserver
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Special thanks to [vitiko98](https://github.com/vitiko98) for the inspiration from qobuz-dl
- Thanks to all contributors who have helped improve this project
