# Initial test data.
# It is initialized once at test start, and as every test runs in a transaction
# it is ensured it will be like this at the begining.
#
# It can be run manually with:
#   MIX_ENV=test mix run priv/repo/test_seeds.exsmix run priv/repo/test_seeds.exs
#
require Logger

all_perms = [
  "auth.modify_self",
  "auth.modify_any",
  "auth.create_user",
  "auth.token.create",
  "auth.info_any_user",
  "auth.modify_groups",
  "auth.manage_groups",
  "plugin",
  "project.create",
  "project.update",
  "project.delete",
  "project.get",
  "dashboard.widget.create",
  "dashboard.widget.update",
  "service.create",
  "service.update",
  "service.delete",
  "service.get",
  "service.attach",
  "debug",
  "action.trigger",
  "action.watch",
  "settings.view",
  "settings.update",
  "settings.user.view",
  "settings.user.update",
  "settings.user.view_all",
  "settings.user.update_all",
  "notifications.create",
  "notifications.create_all",
  "notifications.list",
  "rules.update",
  "rules.view"
]

user_perms = [
  "auth.modify_self",
  "auth.token.create",
  "action.trigger",
  "action.watch",
  "project.get",
  "service.get",
  "settings.user.view",
  "settings.user.update",
  "notifications.create"
]

data = [
  groups: [
    %{name: "user", perms: user_perms},
    %{name: "admin", perms: all_perms}
  ],
  users: [
    %{
      email: "dmoreno@serverboards.io",
      name: "David Moreno",
      is_active: true,
      groups: ["user", "admin"]
    }
  ],
  password: [{"dmoreno@serverboards.io", "asdfasdf"}]
]

defmodule Seeds do
  alias Serverboards.Repo
  alias Serverboards.Auth.Model
  alias Serverboards.Auth

  def import_data([]) do
    :ok
  end

  def import_data([h | t]) do
    {what, value} = h
    Logger.info("Update #{inspect(what)} with #{inspect(value)}")

    case what do
      :users ->
        Enum.map(value, &import_user(&1))

      :groups ->
        Enum.map(value, &import_group(&1))

      :password ->
        Enum.map(value, &import_password(&1))

      _ ->
        Logger.error("Dont know how to import #{inspect(what)} data")
    end

    import_data(t)
  end

  def system_user do
    %{
      email: "system",
      id: -1,
      perms: [
        "auth.modify_self",
        "auth.modify_any",
        "auth.create_user",
        "auth.token.create",
        "auth.info_any_user",
        "auth.modify_groups",
        "auth.manage_groups",
        "plugin",
        "serverboard.add",
        "serverboard.update",
        "serverboard.delete",
        "serverboard.info",
        "service.create",
        "service.attach",
        "service.update",
        "service.delete",
        "debug"
      ]
    }
  end

  def import_user(user) do
    u = Repo.get_or_create_and_update(Model.User, [email: user.email], user)

    Enum.map(user.groups, fn gn ->
      Repo.get_or_create_and_update(Model.Group, [name: gn], %{name: gn})
      :ok = Auth.Group.user_add(gn, user.email, system_user)
    end)
  end

  def import_group(group) do
    Enum.map(group.perms, fn p ->
      Repo.get_or_create_and_update(Model.Group, [name: group.name], %{name: group.name})
      :ok = Auth.Group.perm_add(group.name, p, system_user)
    end)
  end

  def import_password({email, password}) do
    {:ok, user} = Auth.User.user_info(email, system_user)
    :ok = Auth.User.Password.password_set(user, password, user)
  end
end

# Serverboards.Repo.transaction fn ->
Seeds.import_data(data)
# end
