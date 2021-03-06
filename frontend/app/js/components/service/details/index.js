import React from 'react'
import Modal from 'app/components/modal'
import Loading from 'app/components/loading'
import Error from 'app/components/error'
import ImageIcon from 'app/components/imageicon'
import IconIcon from 'app/components/iconicon'
import {goto} from 'app/utils/store'
import store from 'app/utils/store'
const icon = require("app/../imgs/services.svg")
import {get_service_data} from '../utils'
import PluginScreen from 'app/components/plugin/screen'

import Empty from 'app/components/empty'
import Settings from 'app/containers/service/settings'
import Logs from 'app/containers/service/logs'
import DetailsTab from './detailstab'
import ExternalUrl from './externalurl'
import {i18n} from 'app/utils/i18n'
import TabBar from 'app/components/tabbar'
import {match_traits} from 'app/utils'
import { colorize } from 'app/utils'
import {simple_tag} from '../utils'
import PropTypes from 'prop-types'

const tab_options={
  details: DetailsTab,
  settings: Settings,
  logs: Logs
}

function get_plugin_component({tab, type}, props){
  if (type!="screen")
    return null
  let sp=tab.split('/')
  return (props) => (
    <PluginScreen
      key={type}
      data={{service: props.service, project: props.project}}
      plugin={sp[0]}
      component={sp[1]}
      service={props.service}
      />
  )
}
function get_external_url_component({tab, type}, props){
  if (type!="external url")
    return null
  const url = get_external_url(tab, props)
  return (props) => (
    <ExternalUrl url={url}/>
  )
}

function get_external_url_template(id, props){
  for(let eu of (props.external_urls || [])){
    if (eu.id==id){
      return eu
    }
  }
  return null
}
function get_external_url(id, props){
  const eu=get_external_url_template(id, props)
  if (!eu)
    return null

  let url = eu.extra.url
  const config = props.service.config
  Object.keys(config).map((k) => {
    url = url.replace(`{config.${k}}`, config[k])
  })
  return url
}

class Details extends React.Component{
  constructor(props){
    super(props)
    this.state = {tab: "details", type: "internal"}
  }
  setTab({tab, type}){
    this.setState({tab, type})
  }
  handleTabChange(id, type){
    if (type=="screen"){
      this.setTab({tab: id, type: "screen"})
    }
    else if (type=="external url"){
      const euc = get_external_url_template(id, this.props)
      if (!euc.extra.iframe){
        const url = get_external_url(id, this.props)
        if (!url)
          console.warn("Invalid URL from %o", id)
        else
          window.open(url)
      }
      else{
        this.setTab({tab: id, type: "external url"})
      }
    }
    else{
      this.setTab({tab: id})
    }
  }
  componentDidMount(){
    this.setTab({tab: "details"})
  }
  render(){
    const props = this.props
    const state = this.state
    if (props.service == "error" || props.template == "error"){
      return (
        <Error>{i18n("Error loading service details. Maybe it does not exist or user has no permissions.")}</Error>
      )
    }
    if (props.loading){
      return (
        <Loading>{i18n("Service details")}</Loading>
      )
    }
    let current_tab = state.tab

    let sections=[
      { name: i18n("Details"), id: "details" },
      { name: i18n("Settings"), id: "settings" },
      { name: i18n("Logs"), id: "logs" },
    ];

    props.screens.map( (s) => {
      if (match_traits({has: s.traits, any: props.service.traits})){
        sections.push({
          name: s.name,
          id: s.id,
          description: s.description,
          type: "screen"
        })
      }
    });

    (props.external_urls || []).map( (u) => {
      sections.push({
        name: u.name,
        id: u.id,
        description: u.description,
        type: "external url",
        icon: !u.extra.iframe ? "external" : null
      })
    })
    let CurrentTab = (
      tab_options[current_tab] ||
      get_plugin_component(state, props) ||
      get_external_url_component(state, props) ||
      Empty
    )

    let handleClose = undefined
    if (props.project)
      handleClose = () => goto(`/project/${props.project.shortname}/services`)

    return (
      <div className="extend">
        <div className="ui top serverboards secondary pointing menu">
          {props.template.icon ? (
            <div className="ui padding">
              <IconIcon icon={props.template.icon} plugin={props.template.plugin}/>
            </div>
          ) : (
            <ImageIcon src={icon} name={props.service.name}/>
          )}

          <div style={{display: "flex", flexDirection: "column"}}>
            <h3 className="ui header oneline" style={{paddingRight: 50, marginBottom: 0}}>{i18n(props.service.name)}</h3>
            <span className="ui meta" style={{lineHeight: "10px"}}>{i18n(props.template.name)}</span>
          </div>
          <TabBar tabs={sections.map( s => ({
            key: s.id,
            label: s.name,
            icon: s.icon,
            onClick: () => this.handleTabChange(s.id, s.type),
            active: (s.id == current_tab),
            description: s.title
          }) ) } />
          <div className="ui aligned right" style={{position: "absolute", top: 10, right: 5, margin: 0}}>
            {(props.service.tags || []).map( s => simple_tag(s)).map( s => (
              <span key={s} className="ui text label">
                {s}&nbsp;
                <i className={`ui rectangular label ${ colorize( s ) }`}/>
              </span>
            ))}
          </div>
        </div>
        <div className="ui extend with scroll">
          <CurrentTab {...props} service={props.service} template={props.template} onClose={handleClose} />
        </div>
      </div>
    )
  }
}

Details.propTypes = {
  screens: PropTypes.arrayOf(PropTypes.object),
  service: PropTypes.shape({
    uuid: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    config: PropTypes.object.isRequired,
  }).isRequired,
  template: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    icon: PropTypes.string,
  }).isRequired
}

export default Details
