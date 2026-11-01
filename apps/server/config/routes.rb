Rails.application.routes.draw do
  get "up" => "health#live"
  get "ready" => "health#ready"

  namespace :public do
    resource :organization, only: :show
    resources :products, only: :index
  end

  namespace :staff do
    resource :organization, only: %i[show update]
    resources :locations, only: %i[create update]
    resources :memberships, only: :index
    resource :overview, only: :show
    resources :members, only: %i[index show create] do
      resources :renewals, only: :create
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
  end

  namespace :webhooks do
    post "workos" => "workos#create"
  end

  scope :member, module: :member_area, as: :member do
    resource :profile, only: :show
  end
end
