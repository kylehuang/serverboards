require Logger

defmodule Serverboards.Dashboard.RPC do
  alias MOM.RPC
  alias MOM

  def start_link(options \\ []) do
    {:ok, mc} = RPC.MethodCaller.start_link(options)

    # Adds that it needs permissions.
    Serverboards.Utils.Decorators.permission_method_caller(mc)

    RPC.MethodCaller.add_method(
      mc,
      "dashboard.create",
      fn attr, context ->
        me = RPC.Client.get(context, :user)

        attr =
          Serverboards.Utils.keys_to_atoms_from_list(attr, ~w"project name order config alias")

        Serverboards.Dashboard.dashboard_add(attr, me)
      end,
      required_perm: "dashboard.create",
      context: true
    )

    RPC.MethodCaller.add_method(
      mc,
      "dashboard.update",
      fn attr, context ->
        me = RPC.Client.get(context, :user)
        attr = Serverboards.Utils.keys_to_atoms_from_list(attr, ~w"uuid name order config alias")
        Serverboards.Dashboard.dashboard_update(attr, me)
        :ok
      end,
      required_perm: "dashboard.update",
      context: true
    )

    RPC.MethodCaller.add_method(
      mc,
      "dashboard.delete",
      fn attr, context ->
        me = RPC.Client.get(context, :user)
        Serverboards.Dashboard.dashboard_remove(attr["uuid"], me)
        :ok
      end,
      required_perm: "dashboard.delete",
      context: true
    )

    RPC.MethodCaller.add_method(
      mc,
      "dashboard.list",
      fn attr, context ->
        me = RPC.Client.get(context, :user)

        Serverboards.Dashboard.dashboard_list(%{project: attr["project"]}, me)
        |> Enum.map(&Map.take(&1, ~w"uuid order name alias"a))
      end,
      required_perm: "project.get",
      context: true
    )

    RPC.MethodCaller.add_method(
      mc,
      "dashboard.get",
      fn attr ->
        dashboard =
          case attr do
            [uuid] ->
              Serverboards.Dashboard.dashboard_get(uuid)

            %{"uuid" => uuid} ->
              Serverboards.Dashboard.dashboard_get(uuid)

            %{"alias" => alias_, "project" => project} ->
              Serverboards.Dashboard.dashboard_alias_get(alias_, project)

            %{"alias" => alias_} ->
              Serverboards.Dashboard.dashboard_alias_get(alias_)
          end

        case dashboard do
          {:error, whatever} ->
            {:error, whatever}

          dashboard ->
            Map.take(dashboard, ~w"uuid name updated_at inserted_at config order widgets alias"a)
        end
      end,
      required_perm: "project.get"
    )

    RPC.MethodCaller.add_method(
      mc,
      "dashboard.widget.create",
      fn attr, context ->
        me = RPC.Client.get(context, :user)
        Logger.debug("Create widget #{inspect(attr)}")

        if attr["project"] do
          Serverboards.Dashboard.Widget.widget_add(
            attr["project"],
            %{
              config: attr["config"],
              ui: attr["ui"],
              widget: attr["widget"]
            },
            # DEPRECATED 17.04
            me
          )
        else
          Serverboards.Dashboard.Widget.widget_add_v2(
            attr["dashboard"],
            %{
              config: attr["config"],
              ui: attr["ui"],
              widget: attr["widget"]
            },
            me
          )
        end
      end,
      required_perm: "dashboard.widget.create",
      context: true
    )

    RPC.MethodCaller.add_method(
      mc,
      "dashboard.widget.delete",
      fn [uuid], context ->
        me = RPC.Client.get(context, :user)
        Serverboards.Dashboard.Widget.widget_remove(uuid, me)
      end,
      required_perm: "dashboard.widget.create",
      context: true
    )

    RPC.MethodCaller.add_method(
      mc,
      "dashboard.widget.update",
      fn attr, context ->
        me = RPC.Client.get(context, :user)

        config =
          [
            config: attr["config"],
            ui: attr["ui"],
            widget: attr["widget"]
          ]
          |> Enum.filter(fn {_key, value} -> value != nil end)
          |> Map.new()

        Serverboards.Dashboard.Widget.widget_update(attr["uuid"], config, me)
      end,
      required_perm: "dashboard.widget.update",
      context: true
    )

    RPC.MethodCaller.add_method(
      mc,
      "dashboard.widget.list",
      fn [shortname] ->
        Serverboards.Dashboard.Widget.widget_list(shortname)
      end,
      required_perm: "project.get"
    )

    RPC.MethodCaller.add_method(
      mc,
      "dashboard.widget.get",
      fn [shortname] ->
        Serverboards.Dashboard.Widget.widget_get(shortname) |> Serverboards.Utils.clean_struct()
      end,
      required_perm: "project.get"
    )

    RPC.MethodCaller.add_method(
      mc,
      "dashboard.widget.extract",
      fn
        [uuid, vars], context ->
          me = RPC.Client.get(context, :user)
          Serverboards.Dashboard.Widget.extract(uuid, vars, me)
      end,
      required_perm: "project.get",
      context: true
    )

    # Add this method caller once authenticated.
    MOM.Channel.subscribe(:auth_authenticated, fn %{client: client} ->
      MOM.RPC.Client.add_method_caller(client, mc)
      :ok
    end)

    {:ok, mc}
  end
end
