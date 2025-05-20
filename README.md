# HiBeat - Sistema de Descarga de Música

## Estructura del Proyecto

```
HiBeat/
├── core/                 # Lógica principal de la aplicación
│   ├── api/             # Endpoints de la API
│   ├── models/          # Modelos de datos
│   ├── services/        # Lógica de negocio
│   │   ├── qobuz/      # Servicios específicos de Qobuz
│   │   └── __init__.py
│   ├── utils/           # Utilidades y helpers
│   ├── admin.py
│   ├── apps.py
│   ├── exceptions.py
│   ├── serializers.py
│   ├── tests.py
│   └── urls.py
├── HiBeat/              # Configuración de Django
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── manage.py            # Script de gestión de Django
├── requirements.txt     # Dependencias del proyecto
└── venv/               # Entorno virtual
```

## Requisitos

- Python 3.8+
- Django
- Dependencias listadas en requirements.txt

## Instalación

1. Crear entorno virtual:
```bash
python -m venv venv
source venv/bin/activate
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Ejecutar migraciones:
```bash
python manage.py migrate
```

4. Iniciar servidor:
```bash
python manage.py runserver
```
