Rails.application.routes.draw do
  get "up" => "health#live"
  get "ready" => "health#ready"

  namespace :public do
    resource :organization, only: :show
    resources :products, only: :index
  end

  namespace :staff do
    resource :organization, only: :show
    resource :overview, only: :show
    resources :members, only: %i[index show create]
    resources :products, only: :index
    resources :sales, only: %i[index show create] do
      resources :payments, only: :create
      resource :fulfill, only: :create, controller: "fulfillments"
    end
    resources :check_ins, only: %i[index create]
  end

  scope :member, module: :member_area, as: :member do
    resource :profile, only: :show
  end
end
