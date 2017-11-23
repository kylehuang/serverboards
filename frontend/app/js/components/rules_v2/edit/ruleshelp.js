import React from 'react'
import i18n from 'app/utils/i18n'
import cache from 'app/utils/cache'
import {map_get} from 'app/utils'

class DL extends React.Component{
  constructor(props){
    super(props)

    this.state = {
      open: this.props.open
    }
  }
  render(){
    const {open} = this.state
    const {label, value} = this.props
    const simple = !(value instanceof Object)

    if (simple)
      return (
        <li onClick={() => this.setState({open: true})}>
          <label className="ui bold text" style={{paddingLeft: 20}}>{label}:</label>
          <span style={{paddingLeft: 10}}>{value}</span>
        </li>
      )

    if (!open)
      return (
        <li onClick={() => this.setState({open: true})}>
          <i className="icon caret right"/>
          <label className="ui bold text">{label}</label>
        </li>
      )

    return (
      <li>
        <label className="ui bold text" onClick={() => this.setState({open: false})}>
          <i className="icon caret down"/>
          {label}
        </label>
        <ul>
          {Object.keys(value).sort().map( k => (
            <li key={k}>
              <DL label={k} value={value[k]}/>
            </li>
          ))}
        </ul>
      </li>
    )
  }
}

function process_actions(actions){
  if (actions.type){
    if (actions.type=="condition"){
      return {...process_actions(actions.then), ...process_actions(actions.else)}
    } else if (actions.type=="action"){
      return {
        [actions.id] : actions.params
      }
    }
  }
  else{
    let ret = {}
    actions.map( ac => {
      ret = {...ret, ...process_actions(ac)}
    })
    return ret
  }
}

class RulesHelp extends React.Component{
  constructor(props){
    super(props)

    this.state = {
      extra_help: {}
    }
  }
  componentDidMount(){
    const id = this.props.rule.rule.when.id
    if (id){
      cache.trigger(this.props.rule.rule.when.trigger).then( trigger => {
        console.log("Got data from rule ", trigger)
        if (trigger && trigger.result){
          const extra_help = this.state.extra_help
          let params = {}
          map_get(trigger, ["start","params"], []).map( p => {
            params[p.name]=p.label
          })
          this.setState({extra_help: {...extra_help, [id]: {...trigger.result, ...params} }})
        }
        // console.log("Trigger ", trigger.result || {})
      })
    }

    // Get the other actions params
    this.cacheGetActions(this.props.rule.rule.actions)
  }
  cacheGetActions(actions){
    console.log(actions)
    for (let ac of actions){
      console.log(ac)
      if (ac.type=="action"){
        this.cacheGetAction(ac)
      } else if (ac.type=="condition") {
        this.cacheGetActions(ac.then)
        this.cacheGetActions(ac.else)
      }
    }
  }
  cacheGetAction(action){
    if (!action.id)
      return
    cache.action(action.action).then( ac => {
      if (map_get(ac, ["extra","call","result"])){
        const extra_help=this.state.extra_help
        let params = ac.extra.call.result || {}
        map_get(ac, ["extra","call","params"], []).map( p => {
          params[p.name]=p.label
        })

        this.setState({extra_help: {...extra_help, [action.id]: params}})
      }
    })
  }
  render(){
    const {rule} = this.props

    // console.log(rule)

    const help = {
      "rule" : {
        "uuid" : i18n("Rule UUID"),
        "name" : i18n("Rule name"),
        "description" : i18n("Rule description")
      },
      ...this.state.extra_help,
      "changes" : this.state.extra_help,
      "prev" : this.state.extra_help
    }

    return (
      <div>
        <h3>{i18n("Conditional template help")}</h3>
        <div className="ui meta">
          {i18n("You can use these variables to construct your exapression, for example 'A.exit == 0'")}
        </div>
        <ul className="ui no bullet list with padding">
          {Object.keys(help).sort().map( k => (
            <DL key={k} label={k} value={help[k]}/>
          ))}
        </ul>
      </div>
    )
  }
}

export default RulesHelp
