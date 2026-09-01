from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Auth, profile, department dashboards, admin user management
    path('api/', include('users.urls')),
    # Shoot Plan module: plans, reels, photos, crew, budget, reviews, feedback
    path('api/', include('shootplan.urls')),
    # Directory: brands, team, freelancers, models
    path('api/', include('directory.urls')),
]

# Served unconditionally (not just when DEBUG=True) -- the free-tier Render
# deployment has no separate media server/CDN in front of it, so Django must
# serve uploaded files itself in production too, or every image URL 404s.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
