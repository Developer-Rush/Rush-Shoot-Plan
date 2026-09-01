from django.core.management.base import BaseCommand

from shootplan.models import ShootPlan
from directory.models import Brand


class Command(BaseCommand):
    """One-off cleanup: delete every Shoot Plan, and the named test Brands.

    Meant to be run once (e.g. via the Render build command) and then
    removed -- see the comment on this file's git history for context.
    """

    def handle(self, *args, **options):
        plan_count, _ = ShootPlan.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {plan_count} ShootPlan-related row(s).'))

        brands = Brand.objects.filter(name__in=['Test 3', 'Test 4'])
        brand_names = list(brands.values_list('name', flat=True))
        deleted_count, _ = brands.delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_count} Brand row(s): {brand_names}'))
