require Logger

defmodule Serverboards.Auth.RPC do
  alias MOM.RPC
  alias Serverboards.Auth

  def start_link(_args \\ [], options \\ []) do
    {:ok, mc} = RPC.MethodCaller.start_link([name: __MODULE__] ++ options)

    # Adds that it needs permissions and user
    Serverboards.Utils.Decorators.permission_method_caller(mc)

    import RPC.MethodCaller

    ## My own user management
    add_method(
      mc,
      "auth.set_password",
      fn [current, password], context ->
        user = RPC.Client.get(context, :user)

        case Serverboards.Auth.auth(%{
               "type" => "basic",
               "email" => user.email,
               "password" => current
             }) do
          {:ok, user} ->
            Logger.info("#{user.email} changes password.", user: user.email)

            Serverboards.Auth.User.Password.password_set(user, password, user)

          {:error, _other} ->
            Logger.error("#{user.email} try to change password, no match previous.",
              user: user.email
            )

            {:error, :invalid_password}
        end
      end,
      required_perm: "auth.modify_self",
      context: true
    )

    add_method(
      mc,
      "auth.token.create",
      fn [], context ->
        user = RPC.Client.get(context, :user)
        Logger.info("#{user.email} created new token.")
        Serverboards.Auth.User.Token.create(user)
      end,
      required_perm: "auth.token.create",
      context: true
    )

    add_method(
      mc,
      "auth.token.update",
      fn [token], context ->
        user = RPC.Client.get(context, :user)
        Logger.info("#{user.email} refreshes a token.", user: user, token: token)
        Serverboards.Auth.User.Token.refresh(token, user.email)
      end,
      required_perm: "auth.token.create",
      context: true
    )

    add_method(
      mc,
      "auth.user",
      fn
        [], context ->
          RPC.Client.get(context, :user)

        %{}, context ->
          RPC.Client.get(context, :user)
      end,
      context: true
    )

    ## User management
    add_method(
      mc,
      "user.list",
      fn
        [] ->
          Auth.User.user_list(nil)

        %{} ->
          Auth.User.user_list(nil)
      end,
      required_perm: "auth.list"
    )

    add_method(
      mc,
      "user.create",
      fn attributes, context ->
        me = RPC.Client.get(context, :user)

        Auth.User.user_add(
          %{
            email: attributes["email"],
            name: attributes["name"],
            is_active: attributes["is_active"]
          },
          me
        )
      end,
      required_perm: "auth.create_user",
      context: true
    )

    add_method(
      mc,
      "user.update",
      fn [email, operations], context ->
        me = RPC.Client.get(context, :user)
        Auth.User.user_update(email, operations, me)
      end,
      required_perm: "auth.modify_self",
      context: true
    )

    ## Group management
    add_method(
      mc,
      "group.list",
      fn [] ->
        Auth.Group.group_list(nil)
      end,
      required_perm: "auth.list"
    )

    add_method(
      mc,
      "group.create",
      fn [name], context ->
        me = RPC.Client.get(context, :user)
        Auth.Group.group_add(name, me)
      end,
      required_perm: "auth.modify_groups",
      context: true
    )

    add_method(
      mc,
      "group.delete",
      fn [name], context ->
        me = RPC.Client.get(context, :user)
        Auth.Group.group_remove(name, me)
      end,
      required_perm: "auth.modify_groups",
      context: true
    )

    add_method(
      mc,
      "group.perm.add",
      fn [group, code], context ->
        me = RPC.Client.get(context, :user)
        Auth.Group.perm_add(group, code, me)
      end,
      required_perm: "auth.manage_groups",
      context: true
    )

    add_method(
      mc,
      "group.perm.delete",
      fn [group, code], context ->
        me = RPC.Client.get(context, :user)
        Auth.Group.perm_remove(group, code, me)
      end,
      required_perm: "auth.manage_groups",
      context: true
    )

    add_method(
      mc,
      "group.get",
      fn [group], context ->
        me = RPC.Client.get(context, :user)

        %{
          perms: Auth.Group.perm_list(group, me),
          users: Auth.Group.user_list(group, me)
        }
      end,
      required_perm: "auth.manage_groups",
      context: true
    )

    add_method(
      mc,
      "group.user.add",
      fn [group, new_user], context ->
        me = RPC.Client.get(context, :user)
        Auth.Group.user_add(group, new_user, me)
      end,
      required_perm: "auth.manage_groups",
      context: true
    )

    add_method(
      mc,
      "group.user.delete",
      fn [group, user], context ->
        me = RPC.Client.get(context, :user)
        Auth.Group.user_remove(group, user, me)
      end,
      required_perm: "auth.manage_groups",
      context: true
    )

    # permission list
    add_method(
      mc,
      "perm.list",
      fn [] ->
        {:ok, Auth.Permission.perm_list()}
      end,
      required_perm: "auth.manage_groups"
    )

    add_method(
      mc,
      "auth.reauth",
      fn %{"uuid" => uuid, "data" => data}, context ->
        Serverboards.Auth.Reauth.reauth(
          RPC.Client.get(context, :reauth),
          uuid,
          data
        )
      end,
      context: true
    )

    # reauth test
    add_method(
      mc,
      "auth.test_reauth",
      fn [], context ->
        reauth_map =
          Serverboards.Auth.Reauth.request_reauth(
            RPC.Client.get(context, :reauth),
            fn ->
              {:ok, :reauth_success}
            end
          )

        {:error, reauth_map}
      end,
      context: true,
      required_perm: "debug"
    )

    # Add this method caller once authenticated.
    MOM.Channel.subscribe(
      :auth_authenticated,
      fn %{client: client, user: user} ->
        MOM.RPC.Client.add_method_caller(client, mc)
        Logger.debug("Authenticated #{inspect(client)} #{inspect(user.email)}")

        # subscribe this client to changes on this user
        MOM.Channel.subscribe(
          :client_events,
          fn %{type: type, data: data} ->
            cond do
              type in ["group.perm_added", "group.perm.deleted"] ->
                user = RPC.Client.get(client, :user)
                # Logger.debug("Got message for user #{inspect(user, pretty: true)}")
                %{group: group} = data

                if group in user.groups do
                  {:ok, user} = Auth.User.user_info(user.email, user)
                  Logger.debug("Update user #{inspect(user.email)} at client #{inspect(client)}")
                  RPC.Client.set(client, :user, user)

                  Serverboards.Event.emit("user.updated", %{user: user}, ["auth.modify_any"])
                  Serverboards.Event.emit("user.updated", %{user: user}, %{user: user})
                end

              type in ["group.user_added", "group.user.deleted"] ->
                user = RPC.Client.get(client, :user)

                if data.email == user.email do
                  {:ok, user} = Auth.User.user_info(user.email, user)
                  RPC.Client.set(client, :user, user)

                  Serverboards.Event.emit("user.updated", %{user: user}, ["auth.modify_any"])
                  Serverboards.Event.emit("user.updated", %{user: user}, %{user: user})
                end

              true ->
                nil
            end

            :ok
          end,
          monitor: client
        )

        {:ok, reauth_pid} = Serverboards.Auth.Reauth.start_link()
        RPC.Client.set(client, :reauth, reauth_pid)

        :ok
      end,
      monitor: mc
    )

    {:ok, mc}
  end
end
