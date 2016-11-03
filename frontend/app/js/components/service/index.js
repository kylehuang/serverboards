import React from 'react'
import ServiceCards from 'app/containers/service/cards'
import ServiceTable from 'app/containers/service/table'
import Loading from 'app/components/loading'

const ServicesView=React.createClass({
  render(){
    const props=this.props
    return (
      <div>
        {props.mode == "list" ? (
          <ServiceTable services={props.services} serverboard={props.serverboard}/>
        ) : (
          <ServiceCards services={props.services} serverboard={props.serverboard}/>
        )}
      </div>
    )
  }
})

export default ServicesView
