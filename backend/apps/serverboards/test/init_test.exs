require Logger

defmodule InitTest do
  use ExUnit.Case, async: false
  @moduletag :capture_log

  # alias Test.Client

  setup_all do
    Test.Ecto.setup()
  end

  test "Run init" do
    init = %Serverboards.Plugin.Init{
      command: "serverboards.test.auth/init.cmd2",
      call: "init",
      id: "test init"
    }

    # WARNING may fail as timers are a bit tight
    {:ok, pid} = Serverboards.Plugin.Init.Supervisor.start_init(init)
    :timer.sleep(100)
    assert Serverboards.Plugin.Runner.status(init.command) == :running
    :timer.sleep(1500)
    # timeout, plugin runner killed the command
    assert Serverboards.Plugin.Runner.status(init.command) == :not_running
    :timer.sleep(1200)
    # and timeout to recover it (min 1s)
    Logger.debug("Ready? normally was 2s wait")
    assert Serverboards.Plugin.Runner.status(init.command) == :running

    Serverboards.Plugin.Init.stop(pid)
  end

  test "Run failing init" do
    init = %Serverboards.Plugin.Init{
      command: "serverboards.test.auth/init.cmd2",
      call: "fail",
      id: "test fail"
    }

    {:ok, pid} = Serverboards.Plugin.Init.Supervisor.start_init(init)
    :timer.sleep(100)
    Logger.debug("Is \"test fail\" running? (should for 1 sec)")
    assert Serverboards.Plugin.Runner.status(init.command) == :running
    :timer.sleep(1500)
    Logger.debug("Is \"test fail\" running? (should have failed)")
    assert Serverboards.Plugin.Runner.status(init.command) == :not_running
    Serverboards.Plugin.Init.stop(pid)
  end

  test "Init reloads when plugins are modified" do
    init = %Serverboards.Plugin.Init{
      command: "serverboards.test.auth/init.cmd2",
      call: "init",
      id: "test.reload"
    }

    {:ok, _pid} = Serverboards.Plugin.Init.Supervisor.start_init(init)
    :timer.sleep(100)

    Serverboards.Event.emit("plugins.reloaded", [])
    :timer.sleep(100)

    # still running, it issued a stop (not kill), it will timeout anyway later
    psux = :os.cmd('ps ux | grep -v grep | grep init2.py')
    Logger.debug("#{inspect(psux)}")
    assert psux != []

    # as it is not a real init, was started manually, should have been removed,
    # and not started
    :timer.sleep(900)
    psux = :os.cmd('ps ux | grep -v grep | grep init2.py')
    Logger.debug("#{inspect(psux)}")
    assert psux == []
  end
end
