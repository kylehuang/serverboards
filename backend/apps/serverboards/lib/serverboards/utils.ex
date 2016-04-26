defmodule Serverboards.Utils do
  @doc ~S"""
  Performs basic cleaning of a struct to convert it into a record, and remove
  private elements, including passwords.

  ## Example

    iex> import JSON
    iex> import Logger
    iex> s= %{ :__ignore__ => "to be ignored", "__ignore_too__" => "to be ignored",
    ...>      :user_pw => "same", "user_pw" => "same", "valid" => "valid",
    ...>      :valid2 => :valid }
    iex> {:ok, json} = JSON.encode( clean_struct(s) )
    iex> Logger.info(json)
    iex> not String.contains? json, "__"
    true
    iex> not String.contains? json, "_pw"
    true

  """
  def clean_struct(st) do
    st = Map.to_list st
    l = Enum.flat_map st, fn {k,v} ->
      k = if is_atom(k) do
        to_string(k)
      else
        k
      end
      cond do
        String.starts_with? k, "__" -> []
        String.ends_with? k, "_pw" -> []
        is_map(v) -> [{k, clean_struct(v)}]
        true -> [{k,v}]
      end
    end
    Map.new(l)
  end
end
