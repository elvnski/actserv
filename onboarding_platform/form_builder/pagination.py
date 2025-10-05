from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPageNumberPagination(PageNumberPagination):
    """
    Custom pagination class for client-side control.
    Uses 'page' and 'pageSize' query parameters (matching TanStack default state keys).
    """
    page_size_query_param = 'pageSize'
    max_page_size = 100
    page_size = 12 # Default page size

    def get_paginated_response(self, data):
        """
        Overrides the response to include total count, page size, and total pages,
        which are needed by the frontend table component.
        """
        return Response({
            'pageIndex': self.page.number,
            'pageSize': self.get_page_size(self.request),
            'totalRows': self.page.paginator.count,
            'totalPages': self.page.paginator.num_pages,
            'rows': data
        })