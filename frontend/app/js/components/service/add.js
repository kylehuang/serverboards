import React from 'react'
import i18n from 'app/utils/i18n'
import Selector from 'app/components/selector'
import MarketplaceSelector from 'app/containers/marketplaceselector'
import Flash from 'app/flash'
import GenericForm from 'app/components/genericform'
import Loading from 'app/components/loading'
import cache from 'app/utils/cache'
import plugin from 'app/utils/plugin'
import {MarkdownPreview} from 'react-marked-markdown'
import ServiceSelect from 'app/components/service/select'
import {goto} from 'app/utils/store'
import Tip from 'app/components/tip'
import utils from 'app/utils'

export class AddServiceDetailsForm extends React.Component{
  constructor(props){
    super(props)
    this.state={
      data: {},
      name: "",
      descritpion: ""
    }

    this.handleAddService = () => {
      const props = this.props
      const state = this.state
      const service = {
        name: state.name,
        type: props.service.id,
        description: state.description,
        config: state.data
      }
      return props
        .onAddService(props.project, service)
    }
  }
  render(){
    const {service, gotoStep, saveButtons} = this.props
    return (
      <div className="ui padding">
        <MarkdownPreview value={service.description}/>

        <form className="ui form">
          <label>{i18n("Service name")}</label>
          <input
            onChange={(ev) => this.setState({name: ev.target.value})}
            defaultValue={this.state.name}
            />
          <label>{i18n("Description")}</label>
          <textarea
            onChange={(ev) => this.setState({description: ev.target.value})}
            defaultValue={this.state.description}
            />
        </form>
        <div className="separator" style={{height: 40}}/>
        <GenericForm fields={service.extra.fields} updateForm={(data) => this.setState({data})}/>
        <div className="separator" style={{height: 40}}/>

        <div className="ui right aligned">
          <div className="ui buttons">
            <button
              className="ui button basic"
              onClick={() => gotoStep(1)}>
                {i18n("Back")}
            </button>
            { saveButtons ? (
                saveButtons.map( sb => (
                  <button key={sb.label} type="button" className={`ui button ${sb.className}`}
                      onClick={() => this.handleAddService().then( (data) => sb.onClick && sb.onClick(data) )}
                      >
                    {sb.label}
                  </button>
                ))
            ) : (
              <button
                className="ui teal button"
                onClick={this.handleAddService}>
                  {i18n("Save and Continue")}
              </button>
            ) }
          </div>
        </div>
      </div>
    )
  }
}

function AddServiceButton({service}){
  return (
    <a className="ui button teal" style={{width:"100%"}}>{i18n("Attach")}</a>
  )
}

class AddServiceRouter extends React.Component{
  constructor(props){
    super(props)
    this.state={
      tab: 1
    }

    this.handleAttachService = (uuid) => {
      props
        .onAttachService(props.project, uuid)
        .then( () => goto(`/project/${props.project}/services/${uuid}`))
    }
  }
  componentDidMount(){
    let self = this
    $(this.refs.checkboxes).find('.checkbox').checkbox({
      onChange(ev){
        // console.log("Enable %o", this)
        self.setState({tab: this.value})
      }
    })
    cache.services().then( all_services => this.setState({all_services}))
  }
  render(){
    const props = this.props
    const tab = this.state.tab
    const {service} = props
    const my_type = service.type
    const my_project = props.project
    return (
      <div className="ui extend">
        <div className="ui padding" style={{paddingBottom:0}}>
          <h2>{i18n("Add {service_type} service to project", {service_type: service.name})}</h2>
          <div className="ui form">
            <div className="inline fields" ref="checkboxes">
              <div className="field">
                <div className="ui radio checkbox">
                  <input name="new_or_create" value="1" type="radio" checked={tab==1 && "checked"}/>
                  <label>{i18n("Create new")}</label>
                </div>
              </div>
              {!props.hide_old && (
                <div className="field">
                  <div className="ui radio checkbox">
                    <input name="new_or_create" value="2" type="radio" checked={tab==2 && "checked"}/>
                    <label>{i18n("Select existing")}</label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="ui with scroll">
        {tab == 1 ? (
          <AddServiceDetailsForm {...props}/>
        ) : (
          <div className="">
            <div className="ui padding extend description">
              {i18n("This services are used on other projects but may be attached to the current one, so they will be shared between the projects.")}
            </div>
            <div className="ui separator" style={{height: 10}}/>
            <div className="ui extend with padding">
              <ServiceSelect
                filter={(s) => s.type == my_type && s.projects.indexOf(my_project)<0 }
                onBack={() => gotoStep(1)}
                onSelect={(s) => this.handleAttachService(s.uuid)}
                bottomElement={AddServiceButton}
                services={this.state.all_services}
                />
            </div>
          </div>
        )}
        </div>
      </div>
    )
  }
}

class ServiceAddRouter extends React.Component{
  constructor(props){
    super(props)
    this.state={
      tab: 1,
      filter: []
    }
  }
  filter(s){
    let type_filter = this.props.filter || {}
    if (type_filter.traits){
      const check = {has: s.traits, all: type_filter.traits}
      if (!utils.match_traits(check))
        return false
    }
    let desc = `${s.name || ""} ${s.description}`.toLocaleLowerCase()
    for (let f of this.state.filter){
      if (desc.indexOf(f)<0)
        return false
    }
    return true
  }
  get_available_services(){
    return cache.service_catalog()
      .then(Object.values)
      .then( services => services.map( s => ({
        ...s,
        description: (s.description || "").split('\n\n')[0]
      })))
  }
  render(){
    const props = this.props
    const state = this.state
    const tab= state.tab
    return (
      <div className="extend">
        <div className="ui attached top form">
          <div className="ui input seamless white">
            <i className="icon search"/>
            <input
              type="text"
              onChange={(ev) => {
                this.setState({filter:ev.target.value.toLocaleLowerCase().split(' ')})
              }}
              placeholder={i18n("Filter...")}
              />
          </div>
        </div>
        <div className="ui padding">
          <h2 className="ui centered header">
            <i className={`icon cloud`}/>
            {i18n("Add a service to this project")}
          </h2>
          <div>
            {i18n("First select the service type. If not available at the already installed services, there are many more available to install at the marketplace.")}
          </div>
        </div>
        <div className="ui separator" style={{height:10}}/>
        <div className="ui pointing secondary menu">
          <a className={`item ${tab==1 ? "active" : ""}`} onClick={() => this.setState({tab:1})}>
            {i18n("Available services")}
          </a>
          <a className={`item ${tab==2 ? "active" : ""}`} onClick={() => this.setState({tab:2})}>
            {i18n("Marketplace")}
          </a>
        </div>
        { tab==1 ? (
          <Selector
            key="installed"
            show_filter={false}
            filter={this.filter.bind(this)}
            get_items={this.get_available_services.bind(this)}
            onSelect={(what) => props.onSelectServiceType(what)}
            current={(props.service || {}).type}
            onSkip={props.onSkip}
            skip_label={props.skip_label}
            prevStep={props.prevStep}
            prev_label={props.prev_label}
            />
        ) : (tab == 2) ? (
          <MarketplaceSelector
            key="marketplace"
            type="service"
            afterInstall={props.onSelectServiceType.bind(this)}
            show_filter={false}
            filter={this.filter.bind(this)}
            onSkip={props.onSkip}
            skip_label={props.skip_label}
            prevStep={props.prevStep}
            prev_label={props.prev_label}
            />
        ) : (
          <Loading>{i18n("Installing the required add-on")}</Loading>
        ) }
      </div>
    )
  }
}

class AddService extends React.Component{
  constructor(props){
    super(props)
    this.state={
      step: 1,
      service: undefined,
    }
  }
  handleSelectServiceType(service){
    this.setState({step:2, service})
  }
  render(){
    var section = null
    switch (this.state.step){
      case 1:
        section = (
          <ServiceAddRouter
            onSelectServiceType={(s) => this.handleSelectServiceType(s)}
            service={this.state.service}
            {...this.props}
            />
        )
        break;
      case 2:
        section = (
          <AddServiceRouter
            service={this.state.service}
            gotoStep={(step) => this.setState({step})}
            project={this.props.project.shortname}
            onAddService={this.props.onAddService}
            onAttachService={this.props.onAttachService}
            hide_old={this.props.hide_old}
            saveButtons={this.props.saveButtons}
            />)
        break;
    }

    return (
      <div className="ui expand two column grid grey background" style={{margin:0}}>
        <div className="ui column">
          <Tip
            className="ui round pane white background with padding"
            top_img={require("imgs/024-illustration-addaddons.svg")}
            title={i18n("Add Services to your project.")}
            middle_img={require("imgs/019-illustration-tips.svg")}
            subtitle={i18n("Add services you are already subscribed to manage, monitor or automate tasks with them.")}
            description={i18n(`
Serverboards core elements are services. Services are definitions of how to connect
to services and servers. This may mean required credentials, url addresses and so
on.

Here you can select the type of service you want to add, or check out at the store
to find more service types to use in Serverboards.
`)}
              />
        </div>

        <div className="ui column">
          <div className="ui round pane white background">
            {section}
          </div>
        </div>
      </div>
    )
  }
}


export default AddService
