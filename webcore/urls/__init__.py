from django.conf.urls.defaults import *
from django.conf import settings


urlpatterns = patterns('',
    (r'^',  include('webcore.urls.robots')),
    (r'^',  include('webcore.urls.favicon')),
    (r'^',  include('webcore.urls.ifdev')),
#   (r'^',  include('webcore.urls.sitemap')), # Not useful enough.
)

