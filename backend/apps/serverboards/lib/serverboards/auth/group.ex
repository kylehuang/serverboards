import Ecto.Query

alias Serverboards.Repo
alias Serverboards.MOM
alias Serverboards.Auth
alias Serverboards.Auth.User
alias Serverboards.Auth.Model

defmodule Serverboards.Auth.Group do

  def setup_eventsourcing(es) do
    alias Serverboards.Repo

    EventSourcing.subscribe es, :add_group, fn %{name: name}, me ->
      Repo.insert(%Model.Group{
          name: name
        })
      MOM.Channel.send( :client_events, %MOM.Message{ payload: %{ type: "group.added", data: %{ group: name} } } )
    end

    EventSourcing.subscribe es, :add_user_to_group, fn %{group: group, user: user}, _me ->
      group = Repo.get_by!(Model.Group, name: group)
      user = Repo.get_by!(Model.User, email: user)
      case Repo.get_by(Model.UserGroup, user_id: user.id, group_id: group.id) do
        nil ->
          Repo.insert( %Model.UserGroup{ user_id: user.id, group_id: group.id } )
        ug -> ug
      end
      MOM.Channel.send( :client_events, %MOM.Message{ payload: %{ type: "group.user_added", data: %{ group: group, user: user} } } )
    end

    EventSourcing.subscribe es, :add_perm_to_group, fn %{ group: group, perm: code}, _me ->

      case Repo.one(
          from gp in Model.GroupPerms,
          join: g in Model.Group,
            on: g.id == gp.group_id,
          join: p in Model.Permission,
            on: p.id == gp.perm_id,
          where: g.name == ^group and p.code == ^code,
          select: p.id
          ) do
        nil ->
          group = Repo.get_by!(Model.Group, name: group)
          perm = Auth.Permission.ensure_exists(code)
          Repo.insert( %Model.GroupPerms{ group_id: group.id, perm_id: perm.id } )

          MOM.Channel.send( :client_events, %MOM.Message{ payload: %{ type: "group.perm_added", data: %{ group: group, perm: code} } } )
          :ok
        gp ->
           nil
      end
    end

  end

  def group_add(name, me) when is_binary(name) do
    if Enum.member? me.perms, "auth.modify_groups" do
      EventSourcing.dispatch(:auth, :add_group, %{name: name}, me.email)
      :ok
    else
      {:error, :not_allowed}
    end
  end

  def user_add(group, user, me) when is_binary(group) and is_binary(user) do
    if Enum.member? me.perms, "auth.manage_groups" do
      EventSourcing.dispatch(:auth, :add_user_to_group, %{group: group, user: user}, me.email)
      :ok
    else
      {:error, :not_allowed}
    end
  end

  def perm_add(group, perm, me) when is_binary(group) and is_binary(perm) do
    if Enum.member? me.perms, "auth.manage_groups" do
      EventSourcing.dispatch(:auth, :add_perm_to_group, %{group: group, perm: perm}, me.email)
      :ok
    else
      {:error, :not_allowed}
    end
  end

  @doc ~S"""
  List of all groups
  """
  def group_list(_me) do
    Repo.all(
      from g in Model.Group, select: g.name
    )
  end

  @doc ~S"""
  Retuns a list of user (by email) that belong to that group.
  """
  def user_list(group, _me) do
    Repo.all(
       from u in Model.User,
      join: ug in Model.UserGroup,
        on: u.id == ug.user_id,
      join: g in Model.Group,
        on: g.id == ug.group_id,
     where: g.name == ^group,
     select: u.email
    )
  end
end
