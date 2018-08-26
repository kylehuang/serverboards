import React from 'react'
import Loading from 'app/components/loading'
import NotificationItem from './item'
import {months} from 'app/utils'
import {i18n} from 'app/utils/i18n'
import {SectionMenu} from 'app/components'

require('sass/table.sass')

function Menu(props){
  return (
    <div className="ui secondary top menu">
      <h3 className="ui header">{i18n("All Notifications")}</h3>

      <div className="item stretch"/>

      <a onClick={props.handleShowFirstPage} style={{cursor:"pointer"}} className="item">{i18n("First page")}</a>
      <a onClick={props.handleShowNextPage} style={{cursor:"pointer"}} className="item">{i18n("Next page")}</a>
    </div>
  )
}

function List(props){
  let month=undefined
  let year=(new Date()).getFullYear()
  let lastyear=year
  function maybe_month(d){
    const dd=new Date(d)
    const dmonth=dd.getMonth()
    const dyear=dd.getFullYear()
    if (month==dmonth && dyear==lastyear)
      return []
    month=dmonth
    let txt=i18n(months[month])

    if (dyear!=year){
      txt=txt+' '+dyear
    }

    return (
      <div className="ui rail left"><span className="ui tiny header">{txt}</span></div>
    )
  }

  if (props.loading)
    return (
      <React.Fragment>
        <SectionMenu menu={Menu} {...props}/>
        <Loading>{i18n("Notifications")}</Loading>
      </React.Fragment>
    )
  const list = props.list

  return(
    <div className="ui split area vertical">
      <SectionMenu menu={Menu} {...props}/>

      <div className=" expand with scroll">
        <div className="ui text container">
          <div className="ui relaxed divided list" id="message_list">
            {(list && list.length>0) ? list.map( (n) => (
              <div className="item">
                {maybe_month(n['inserted_at'])}
                <NotificationItem notification={n}/>
              </div>
            )) : (
              <div className="ui padding">{i18n("No messages yet...")}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default List
