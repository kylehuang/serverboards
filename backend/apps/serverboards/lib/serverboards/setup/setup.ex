require Logger

defmodule Serverboards.Setup do
  @moduledoc ~S"""
  Performs setup tasks, as initial database setup or permission updates
  """
  alias Serverboards.Repo
  alias Serverboards.Auth.Model
  alias Serverboards.Auth

  defp all_perms do
    [
    "http.port_to_websocket",
    "auth.modify_self", "auth.modify_any",
    "auth.create_user", "auth.token.create",
    "auth.info_any_user", "auth.list",
    "auth.modify_groups", "auth.manage_groups",
    "plugin", "plugin.data", "plugin.install", "plugin.catalog",
    "project.create", "project.update",
    "project.delete", "project.get",
    "dashboard.widget.create", "dashboard.widget.update",
    "dashboard.create", "dashboard.update", "dashboard.remove",
    "service.create", "service.update",
    "service.delete", "service.get",
    "service.attach",
    "settings.user.view", "settings.user.view_all",
    "settings.user.update", "settings.user.update_all",
    "settings.view", "settings.update",
    "debug",
    "notifications.create", "notifications.create_all",
    "notifications.list",
    "action.trigger", "action.watch", "action.update",
    "rules.update", "rules.view", "rules.trigger", "rules.delete", "rules.create",
    "logs.view",
    "issues.view", "issues.create", "issues.update"
    ]
  end

  def start do
    {:ok, _} = Application.ensure_all_started(:ecto)
    {:ok, _} = Application.ensure_all_started(:postgrex)
    {:ok, _} = Application.ensure_all_started(:logger)
    if Process.whereis(Serverboards.Repo) != nil do
      {:ok, nil} # already running
    else
      database = Serverboards.Config.get( :database )

      {:ok, _pid} = Serverboards.Repo.start_link(database)
    end
  end

  def exit(nil), do: :ok
  def exit(pid), do: Process.exit(pid, :normal)

  @doc ~S"""
  Setups the database for initial state, with given username and password
  """
  def initial(options \\ []) do
    start()
    import_user(%{
      email: Keyword.get(options, :email, "admin@serverboards.io"),
      name: "Admin",
      is_active: true,
      groups: ["user", "admin"],
      password: Keyword.get(options, :password, UUID.uuid4)
    })
    :init.stop()
  end

  @doc ~S"""
  Ensures some data is up to date, as default groups and permissions
  """
  def update do
    Logger.debug("Updating database")
    # update database
    path = Application.app_dir(:serverboards, "share/serverboards/backend/migrations")
    Ecto.Migrator.run(Serverboards.Repo, path, :up, all: true)
    path = Application.app_dir(:serverboards, "priv/repo/migrations")
    Ecto.Migrator.run(Serverboards.Repo, path, :up, all: true)

    import Ecto.Query
    status = %{
      perms: Repo.all( from p in Model.Permission, select: {p.code, p.id} ) |> Map.new
    }

    import_group(status, %{ name: "user", perms: []} )
    import_group(status, %{ name: "admin", perms: all_perms()} )
    Logger.debug("Done")
  end

  @doc ~S"""
  Imports an user into the system or updates it
  """
  def import_user(user) do
    u = Repo.get_or_create_and_update(Model.User, [email: user.email], user)

    Enum.map user.groups, fn gn ->
      group = Repo.get_or_create_and_update(Model.Group, [name: gn], %{name: gn})
      _ = Repo.get_or_create_and_update(Model.UserGroup, [group_id: group.id, user_id: u.id], %{group_id: group.id, user_id: u.id})
    end

    :ok = Auth.User.Password.password_set(u, user.password, u)
  end

  @doc ~S"""
  Ensures this group with thouse permissions exist.

  """
  def import_group(status, group) do
    #Could be optimized/coded smartily, but not really needed.
    # For example use the perms at status to get the permids I want, do a
    # set difference, and just add whats needed.
    import Ecto.Query

    groupm = Repo.get_or_create_and_update(
      Model.Group,
      [name: group.name],
      %{name: group.name}
      )
    perms = group.perms # perms I want by name
    #IO.puts("#{inspect Enum.sort(perms)}")
    #IO.puts("#{inspect Enum.sort(group.perms)}")
    group_perms = Repo.all( # perms I have by id
      from gp in Model.GroupPerms,
        where: gp.group_id == ^groupm.id,
        select: gp.perm_id
      )
    for p <- perms do
      # get from cache, or db
      perm_id = case status.perms[p] do
        nil ->
          Repo.get_or_create_and_update(Model.Permission, [code: p], %{ code: p }).id
        perm_id -> perm_id
      end
      if not perm_id in group_perms do
        #IO.puts("Add perm #{p} to group #{group.name}")
        Repo.get_or_create_and_update(
          Model.GroupPerms,
          [ group_id: groupm.id, perm_id: perm_id ],
          %{ group_id: groupm.id, perm_id: perm_id }
          )
      end
    end
  end

  """
  defp system_user do
    %{
      email: "system",
      id: -1,
      perms: all_perms
    }
  end
  """
end
