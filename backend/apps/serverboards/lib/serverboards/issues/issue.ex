require Logger

defmodule Serverboards.Issues.Issue do
  alias Serverboards.Repo
  alias Serverboards.Issues.Model

  def add(%{} = data, me) do
    import Ecto.Query
    {:ok, EventSourcing.dispatch(:issues, :issue_add, data, me.email).issue_id}
    #case Repo.all( from i in Model.Issue, order_by: [:id], select: i.id ) do
    #  [id] -> {:ok, id}
    #  [] -> {:error, :unknown_issue}
    #end
  end
  def update(issue_id, %{ type: _, data: _, title: _} = data, me) do
    EventSourcing.dispatch(:issues, :issue_update, %{ id: issue_id, data: data}, me.email)
    {:ok, :ok}
  end

  def add_real(data, me) do
    import Ecto.Query
    creator_id = case Serverboards.Auth.User.get_id_by_email( me ) do
      {:ok, creator_id} -> creator_id
      _ -> nil
    end
    {:ok, issue} = Repo.insert( %Model.Issue{
      creator_id: creator_id,
      title: data.title,
      status: "open"
      } )
    first_line = Enum.at(String.split(data.description, "\n", parts: 2), 0)
    {:ok, _description} = Repo.insert( %Model.Event{
      creator_id: creator_id,
      issue_id: issue.id,
      title: first_line,
      type: "comment",
      data: %{
        comment: data.description
      } } )

    (data[:aliases] || []) |> Enum.map(fn alias_ ->
      {:ok, _description} = Repo.insert( %Model.Alias{
        issue_id: issue.id,
        alias: alias_,
        } )
    end)

    issue.id
  end
  def update_real(issue_id, %{ title: title, type: type, data: data }, me) when is_number(issue_id) do
    import Ecto.Query
    creator_id = case Serverboards.Auth.User.get_id_by_email( me ) do
      {:ok, creator_id} -> creator_id
      _ -> nil
    end
    {:ok, _description} = Repo.insert( %Model.Event{
      creator_id: creator_id,
      issue_id: issue_id,
      title: title,
      type: type,
      data: data
      } )
    if type == "change_status" do
      Repo.update_all(
        (from i in Model.Issue, where: i.id == ^issue_id),
        set: [status: data["status"] ]
      )
    end
  end
  def update_real(alias_id, data, me) do
    alias_to_ids(alias_id) |> Enum.map(fn issue_id ->
      update_real(issue_id, data, me)
    end)
  end

  def decorate_user(nil) do
    nil
  end
  def decorate_user(user) do
    %{
      email: user.email,
      is_active: user.is_active,
      name: user.name
    }
  end
  def decorate_event(event) do
    event = event |> Repo.preload(:creator)
    %{
      type: event.type,
      creator: decorate_user( event.creator ),
      data: event.data,
      title: event.title,
      inserted_at: Ecto.DateTime.to_iso8601(event.inserted_at)
    }
  end

  def get(id) when is_number(id) do
    import Ecto.Query
    case Repo.all( from i in Model.Issue, where: i.id == ^id, preload: [:events, :creator] ) do
      [] -> {:error, :not_found}
      [issue] ->
        {:ok, %{
          id: issue.id,
          title: issue.title,
          creator: decorate_user(issue.creator),
          inserted_at: Ecto.DateTime.to_iso8601(issue.inserted_at),
          status: issue.status,
          events: Enum.map(issue.events, &decorate_event/1 ),
        }}
    end
  end
  def get(id) do
    [issue_id | _ ] = alias_to_ids(id)
    get(issue_id)
  end
  def alias_to_ids(alias_id) do
    import Ecto.Query
    case Integer.parse(alias_id) do
      { id, "" } ->
        [id]
      _ ->
        Repo.all(
          from a in Model.Alias,
          join: i in Model.Issue, on: i.id == a.issue_id,
          where: a.alias == ^alias_id and i.status=="open",
          select: a.issue_id )
    end
  end
end
