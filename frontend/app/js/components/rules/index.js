import React from 'react'
import RuleDetails from './details'

function Rule(props){
  const rule = props.rule

  return (
    <tr onClick={props.onOpenDetails} title={rule.description} style={{cursor: "pointer"}} className={rule.is_active ? "positive" : ""} >
      <td>{rule.name}</td>
      <td>{rule.trigger.service}</td>
      <td>{rule.trigger.trigger}</td>
      <td>{rule.actions.map((ac) => (
        <div><b>{ac.state}:</b><br/><span style={{paddingLeft: 10}}>{ac.action}</span></div>
      ))}</td>
      <td><i className="ui angle right icon"/></td>
    </tr>
  )
}

export default function Rules(props){
  console.log(props)
  if (props.subsection){
    const rule = props.rules.find( (r) => r.id == props.subsection )
    return (
      <div className="ui text container">
        <RuleDetails rule={rule}/>
      </div>
    )
  }
  return (
    <div className="ui text container">
      <h1 className="ui header">Rules for {props.serverboard.name}</h1>

      <table className="ui very basic selectable table">
        <thead>
          <tr>
            <th>Rule</th>
            <th>Service</th>
            <th>Trigger</th>
            <th>Action</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
        {props.rules.map((r) =>
          <Rule rule={r} onOpenDetails={() => props.onOpenDetails(r)}/>
        )}
        </tbody>
      </table>
    </div>
  )
}
