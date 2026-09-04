from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response

from users.permissions import IsAdmin, IsAuthenticatedFullAccess
from users.serializers import enforce_strong_password

from .models import Brand, Freelancer, ModelProfile, TeamMember
from .serializers import BrandSerializer, FreelancerSerializer, ModelProfileSerializer, TeamMemberSerializer


def _status_filter(queryset, params):
    status_param = params.get('status')
    if status_param == 'Active':
        return queryset.filter(is_active=True)
    if status_param == 'Inactive':
        return queryset.filter(is_active=False)
    return queryset


class TeamMemberViewSet(viewsets.ModelViewSet):
    """/api/team/ -- internal Rush Republic staff directory."""

    serializer_class = TeamMemberSerializer
    permission_classes = [IsAuthenticatedFullAccess]

    def get_queryset(self):
        qs = TeamMember.objects.all()
        params = self.request.query_params
        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(email__icontains=search) | Q(mobile__icontains=search)
            )
        role = params.get('role')
        if role:
            qs = qs.filter(role=role)
        branch = params.get('branch')
        if branch:
            qs = qs.filter(branch=branch)
        return _status_filter(qs, params)

    def get_permissions(self):
        # Every other action stays open to any full-access authenticated
        # user (matches the rest of this viewset) -- only resetting a
        # login password is admin-only.
        if self.action == 'reset_password':
            return [IsAdmin()]
        return super().get_permissions()

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """
        Admin-only: reset the login password (users.CustomUser) for whichever
        account shares this Team Member's email -- TeamMember itself is just
        a staff directory entry with no password of its own (see the model's
        docstring), so there's nothing to reset there directly.
        """
        team_member = self.get_object()
        new_password = request.data.get('new_password', '')

        if not new_password:
            return Response({'error': 'Password cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            enforce_strong_password(new_password)
        except (DjangoValidationError, DRFValidationError):
            return Response(
                {'error': 'Password does not meet the required security requirements.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not team_member.email:
            return Response(
                {'error': 'Team member not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        User = get_user_model()
        matches = User.objects.filter(email__iexact=team_member.email)
        if not matches.exists():
            return Response({'error': 'Team member not found.'}, status=status.HTTP_404_NOT_FOUND)
        if matches.count() > 1:
            return Response(
                {'error': 'Unable to reset password. Please try again.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = matches.first()

        if user.pk == request.user.pk:
            return Response(
                {'error': 'You cannot reset your own password through this action.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Django's set_password() hashes it -- never assign to .password directly.
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password reset successfully.'})


class FreelancerViewSet(viewsets.ModelViewSet):
    """/api/freelancers/ -- external photographers/videographers available for shoots."""

    serializer_class = FreelancerSerializer
    permission_classes = [IsAuthenticatedFullAccess]

    def get_queryset(self):
        qs = Freelancer.objects.all()
        params = self.request.query_params
        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(mobile__icontains=search)
                | Q(equipment_summary__icontains=search)
            )
        category = params.get('category')
        if category:
            qs = qs.filter(categories__contains=[category])
        return _status_filter(qs, params)


class ModelProfileViewSet(viewsets.ModelViewSet):
    """/api/models/ -- master directory of talent available for shoots."""

    serializer_class = ModelProfileSerializer
    permission_classes = [IsAuthenticatedFullAccess]

    def get_queryset(self):
        qs = ModelProfile.objects.all()
        params = self.request.query_params
        search = params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search) | Q(mobile__icontains=search))
        gender = params.get('gender')
        if gender:
            qs = qs.filter(gender=gender)
        category = params.get('category')
        if category:
            qs = qs.filter(categories__contains=[category])
        return _status_filter(qs, params)


class BrandViewSet(viewsets.ModelViewSet):
    """/api/brands/ -- client brands and their assigned Rush Republic team."""

    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticatedFullAccess]

    def get_queryset(self):
        qs = Brand.objects.select_related(
            'script_writer', 'social_media_specialist', 'client_servicing', 'production_head'
        )
        params = self.request.query_params
        search = params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search))
        return _status_filter(qs, params)
