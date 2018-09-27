import React from 'react'
import Marketplace from 'app/containers/settings/marketplace'
import i18n from 'app/utils/i18n'

class AddPlugins extends React.Component{
  constructor(props){
    super(props)

    this.state = {
      key: 1
    }
  }
  addAnotherPlugin(){
    console.log("Add another plugin")
    this.setState({key: this.state.key+1})
  }
  render(){
    return (
        <Marketplace
          key={this.state.key}
          nextStep={ () => this.props.nextStep() }
          next_label={i18n("Finish")}
          prevStep={ () => this.props.prevStep() }
          hide_menu={true}
          />
    )
  }
}

export function make_plugins(props){
  return (<AddPlugins {...props}/>)
}
