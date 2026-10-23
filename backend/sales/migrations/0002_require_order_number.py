from django.db import migrations, models

import sales.models


def fill_missing_order_numbers(apps, schema_editor):
    SalesOrder = apps.get_model("sales", "SalesOrder")
    for order in SalesOrder.objects.filter(order_number__isnull=True).iterator():
        order.order_number = sales.models.generate_order_number()
        order.save(update_fields=("order_number",))


class Migration(migrations.Migration):
    dependencies = [
        ("sales", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(fill_missing_order_numbers, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="salesorder",
            name="order_number",
            field=models.CharField(
                default=sales.models.generate_order_number,
                max_length=32,
                unique=True,
            ),
        ),
    ]
