import React from 'react'
import {
    Button,
    Row, Col,
    Form,
    Image,
} from 'react-bootstrap'
import BN from 'bignumber.js'
import _Web3SendTester from './Web3SendTester'
import imgWait from './assets/wait-blocks.gif'

const debug = require('debug')('StakeForm')
const uriQuery = new URLSearchParams(window.location.search)

function createEnum(values) {
  const enumObject = {};
  for (const val of values) {
      enumObject[val] = val;
  }
  return Object.freeze(enumObject);
}

const STATES = createEnum([
  'INIT',
  'REQUESTING',
  'SENT',
  'CONFIRMED',
  'ERROR',
])


const StakeForm = ({ parent }) => {

  const { hearts } = parent.parent.state
  const { stakeAmount } = parent.state
  const hexBalance = BN(hearts).div(1E08).toFixed(4)

  const percentButtonHandler = (e) => {
    const stakeAmount = BN(e.target.value).times(hexBalance).div(100).toFixed(4)
    parent.setState({ stakeAmount })
  }

  return (<>
    <Form>
      <Form.Group as={Row} className="mb-0">
        <Form.Label column="lg" className="text-center text-success">
          <div className="text-muted small">AVAILABLE HEX</div>
          <div>{hexBalance}</div>
        </Form.Label>
      </Form.Group>
      <Form.Group as={Row} className="justify-content-center" controlId="hexAmount">
        <Col xs="auto">
          <Form.Control
            className="text-center"
            type="number"
            step="any"
            size="lg"
            htmlSize={20}
            placeholder="HEX stake amount"
            value={stakeAmount}
            onChange={e => parent.setState({ stakeAmount: e.target.value })}
          />
        </Col>
      </Form.Group>
      <Form.Row>
        <Col className="mt-1">
          <Form.Group className="percent-btns" controlId="amountSelector">
            <Button variant="danger"  onClick={percentButtonHandler} value="10">10%</Button>
            <Button variant="warning" onClick={percentButtonHandler} value="25">25%</Button>
            <Button variant="warning" onClick={percentButtonHandler} value="50">50%</Button>
            <Button variant="info"    onClick={percentButtonHandler} value="75">75%</Button>
            <Button variant="success" onClick={percentButtonHandler} value="100">100%</Button>
          </Form.Group>
        </Col>
      </Form.Row>
    </Form>
  </>)
}

class StakeButton extends React.Component {
  constructor(props) {
    super(props)
    this.parent = props.parent
    this.state = {
      state: STATES.INIT,
      txhash: "",
      confirmationNumber: "",
      error: "",
      stakeAmount: 0,
    }
  }

  stakeButtonHandler = (e) => {
    e.preventDefault()
    const { stakeAmount } = this.state
    this.setState({ state: STATES.REQUESTING })

    const __fn = (uriQuery.has('fakeweb3')) ? _Web3SendTester : this.parent.hex.methods.stakeStart
    __fn("0x"+BN(stakeAmount).times(1E08).toString(16), 5555)
    .send()
    .on('transactionHash', txHash => {
      this.setState({ state: STATES.SENT, txHash })
    })
    .on('receipt', receipt => {
    })
    .on('confirmation', (confirmationNumber, receipt) => {
      confirmationNumber++
      if (this.state.state === STATES.SENT) // avoid multi-trigger from further confirmations
        this.setState({ state: STATES.CONFIRMED, confirmationNumber })
    })
    .on('error', (error, receipt) => {
      if (error) this.setState({ state: STATES.ERROR, error: error.message })
    })
    .catch(error => {
      this.setState({ state: STATES.ERROR, error: error.message })
      debug("Call to stakeStart FAILED: ", error.message)
    })
  }

  render() {
    const { stakeAmount } = this.state

    let content = <><h2>Unknown Condition</h2><p>Check wallet Transaction History for details.</p></>
    let variant = "outline-danger"
    let className = "text-danger"
    switch (this.state.state) {
      case STATES.INIT:
        variant = "primary"
        className = "text-light"
        content = <>
          Stake {stakeAmount} HEX<br/>for 5555 days!</>
        break
        case STATES.REQUESTING:
          variant = "outline-info"
          className = "text-info"
          content = <>Requesting ...</>
          break
      case STATES.SENT:
        variant = "outline-info"
        className = "text-light"
        content = <>
          <p>txHash: {this.state.txHash}</p>
          <Image src={imgWait} width="32" /> Awaiting Confirmation
        </>
        break
      case STATES.CONFIRMED:
        variant = "outline-success"
        className = "text-success"
        content = <>
          <h1>CONFIRMED</h1>
          <p className="text-muted text-uppercase small">{this.state.confirmationNumber} confirmations received</p>
        </>
        window.setTimeout(() => {
          this.setState({ state: STATES.INIT })
          this.parent.refresh()
        }, 3000)
        break
      case STATES.ERROR:
      default:
        variant = "outline-danger"
        className = "text-danger"
        content = <>
          <h2>Oops!</h2>
          <p>{this.state.error}</p>
        </>
        break
    }

    return (<>
      {this.state.state === STATES.INIT ? <>
        <StakeForm parent={this} />
        <Button 
          variant={variant}
          disabled={Number(stakeAmount) < 0.0001}
          className={"mx-0 my-3 "+className} size="lg" type="button" block
          value={stakeAmount}
          onClick={this.stakeButtonHandler}
        >
          {content}
        </Button>
        <Button
          variant="outline-danger"
          size="sm"
          className="mt-3"
          onClick={() => this.parent.setState({ showStakeForm: false })}
        >
          <strong>CANCEL</strong>
        </Button>
      </> : <>
        <Button 
          variant={variant}
          style={{ pointerEvents: "none", minHeight: "8rem" }}
          className={"mx-0 my-3 "+className} size="lg" type="button" block
        >
          {content}
        </Button>      
      </>}
  </>)
  }
}

export default StakeButton