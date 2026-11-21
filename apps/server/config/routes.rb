Rails.application.routes.draw do
  get "up" => "health#live"
  get "ready" => "health#ready"

  namespace :public do
    resource :organization, only: :show
    resources :products, only: :index
    resource :schedule, only: :show
  end

  namespace :staff do
    resource :organization, only: %i[show update]
    resources :locations, only: %i[create update]
    resource :team, only: :show, controller: "team" do
      resources :invitations, only: :create, controller: "team_invitations" do
        post :revoke, on: :member
      end
      resources :members, only: %i[update destroy], controller: "team_members"
    end
    resources :memberships, only: :index
    resource :overview, only: :show
    resources :members, only: %i[index show create] do
      resources :renewals, only: :create
      resource :link, only: %i[create destroy], controller: "member_links"
    end
    resources :products, only: %i[index create update] do
      resources :prices, only: :create
    end
    resources :prices, only: :update do
      post :archive, on: :member
    end
    resources :sales, only: %i[index show create] do
      resources :payments, only: :create
      resources :refunds, only: :create
      resource :fulfill, only: :create, controller: "fulfillments"
      post :void, on: :member
      post :revoke, on: :member
    end
    resources :check_ins, only: %i[index create]
    resources :programs, only: %i[index show create update] do
      resources :occurrences, only: :create
      resources :tickets, only: :create
    end
    resources :occurrences, only: %i[index show] do
      post :cancel, on: :member
      get :options, on: :member, to: "bookings#options"
    end
    resources :bookings, only: :create do
      post :cancel, on: :member
      post :attend, on: :member
    end
  end

  namespace :webhooks do
    post "workos" => "workos#create"
  end

  scope :member, module: :member_area, as: :member do
    resource :profile, only: :show
    resource :account, only: :show
    resource :link, only: :create
    resources :occurrences, only: :show
    resources :bookings, only: %i[index create] do
      post :cancel, on: :member
    end
    resources :checkouts, only: %i[create show] do
      post :cancel, on: :member
      post :test_payment, on: :member
    end
  end
end
