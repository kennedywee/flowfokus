# Authorization

Every staff request passes three separate checks:

| Check | Question | Owner |
| --- | --- | --- |
| Permission | May this person attempt this action? | WorkOS RBAC, enforced by a Rails concern |
| Tenant scope | Does the record belong to the current organization? | Rails queries |
| Business rule | Is the action valid now? | Rails domain models |

Member requests skip the permission check. They are limited to the current member's own records.

## Permissions

WorkOS defines permissions and roles. Organizations can build custom roles from the central permission list. Rails has no role or permission tables.

Example permissions:

```text
products:read   products:create   products:update   products:delete
members:read    members:create    members:update
purchases:read  purchases:refund
staff:manage    settings:manage
```

## Enforcement

`Current.permissions` comes from verified WorkOS session claims for the active organization. See [Identity](identity.md#request-context).

```ruby
module Authorization
  extend ActiveSupport::Concern

  class Forbidden < StandardError; end

  included do
    rescue_from(Forbidden) { head :forbidden }
  end

  private

  def require_permission!(permission)
    raise Forbidden unless Current.permissions.include?(permission)
  end
end
```

```ruby
class ProductsController < ApplicationController
  def create
    require_permission!("products:create")
    product = Current.organization.products.create!(product_params)
    render json: product, status: :created
  end
end
```

## Tenant isolation

- Load tenant-owned records through `Current.organization`, for example `Current.organization.sales`.
- Never link records from different organizations. Use database constraints where practical.
- A permission in one organization grants nothing in another.

## Business rules

Business rules live in models, not in permission checks.

```ruby
class Sale < ApplicationRecord
  def refundable?
    paid? && !refunded? && refundable_until.future?
  end
end
```

Enforce invariants of sensitive operations inside a database transaction.

## Staff management

Flowfokus has its own staff screens. They call the WorkOS API. WorkOS stays the authority.

Users with `staff:manage` can invite staff, change roles, remove access, and create custom roles.

1. The admin makes a change in Flowfokus.
2. Rails rejects privilege escalation and changes that break ownership rules.
3. Flowfokus calls WorkOS.
4. A WorkOS event updates the local copy. See [Identity](identity.md#workos-sync).

Existing sessions can hold old permission claims after a role change. The design must account for this.
