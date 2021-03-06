import React from 'react'
import i18n from 'app/utils/i18n'
import cache from 'app/utils/cache'
import {map_get} from 'app/utils'
import {MarkdownPreview} from 'react-marked-markdown';

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
          <span style={{paddingLeft: 10}}><MarkdownPreview value={i18n(value)}/></span>
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
      extra_help: {},
      show_all: !!this.props.show,
    }
  }
  componentDidMount(){
    const id = this.props.rule.rule.when.id
    if (id){
      cache.trigger(this.props.rule.rule.when.trigger).then( trigger => {
        console.log("Got data from rule ", trigger)
        if (trigger && trigger.extra.result){
          const extra_help = this.state.extra_help
          let params = {}
          map_get(trigger, ["extra", "start", "params"], []).map( p => {
            if (p.name)
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
    // console.log(actions)
    for (let ac of actions){
      // console.log(ac)
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
      const extra_help=this.state.extra_help
      let params = map_get(ac, ["extra","call", "result"]) || {}
      map_get(ac, ["extra","call","params"], []).map( p => {
        params[p.name]=p.label
      })

      this.setState({extra_help: {...extra_help, [action.id]: params}})
    })
  }
  toggleShowHelp(){
    this.setState({show_all: !this.state.show_all})
  }
  render(){
    const {rule, title, description} = this.props
    const {show_all} = this.state
    // console.log(rule)

    const extra_help = this.state.extra_help

    const help = {
      "uuid" : i18n("Rule unique identifier"),
      "rule" : {
        "uuid" : i18n("Rule unique identifier"),
        "name" : i18n("Rule name"),
        "description" : i18n("Rule description"),
      },
      "changes" : extra_help,
      "prev" : extra_help,
      "BASE_URL" : i18n("This installation's base url"),
    }

    return (
      <div className={`ui ${show_all ? "extend" : ""} padding top`}>
        <div className="ui divider"/>
        <h4
            className="ui blue pointer aligned right header"
            onClick={() => this.toggleShowHelp()}
            style={{marginRight: 0}}>
          {title || i18n("Conditional template help")}
          {show_all ? (
            <i className="ui tiny down chevron icon"/>
          ) : (
            <i className="ui tiny right chevron icon"/>
          )}
        </h4>
        {show_all && (
          <div className="ui extend scroll">
            <div className="ui meta">
              {description || i18n("You can use these variables to construct your expression, for example 'A.exit == 0'")}
            </div>
            <div className="ui with scroll">
              <ul className="ui no bullet list with padding inline markdown">
                {Object.keys(extra_help).sort().map( k => (
                  <DL key={k} label={k} value={extra_help[k]}/>
                ))}
                {Object.keys(help).sort().map( k => (
                  <DL key={k} label={k} value={help[k]}/>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    )
  }
}

export default RulesHelp
