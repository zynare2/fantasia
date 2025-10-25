"""
URL configuration for fantasia project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.http import HttpResponse


def test(request):
    return HttpResponse("Hello from fantasia on Vercel")


def static_test(request):
    return HttpResponse(
        """
        <!doctype html>
        <html>
          <head>
            <link rel=\"stylesheet\" href=\"/static/css/test.css\">
          </head>
          <body>
            <h1>Static OK</h1>
            <p>This page uses /static/css/test.css</p>
          </body>
        </html>
        """,
        content_type="text/html",
    )

urlpatterns = [
    path('admin/', admin.site.urls),
    path('test/', test, name='test'),
    path('static-test/', static_test, name='static_test'),
]
