from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Consistent pagination shape: {count, next, previous, results}."""

    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100
