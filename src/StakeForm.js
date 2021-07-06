import React from 'react'
import {
    Button,
    Row, Col,
    Form
} from 'react-bootstrap'
import BN from 'bignumber.js'

const debug = require('debug')('StakeForm')
// const uriQuery = new URLSearchParams(window.location.search)

const StakeButton = ({ parent }) => {
    const { stakeAmount } = parent.state
    const stakeButtonHandler = (e) => {
        e.preventDefault()
        parent.hex.methods.stakeStart("0x"+BN(stakeAmount).times(1E08).toString(16), 5555)
        .send()
        .then((err, result) => {
        debug(err, result)
        })
        .catch(e => debug("Call to stakeStart FAILED: ", e.message))
    }

    return (
        <Button variant="primary" disabled={Number(stakeAmount) < 0.0001}
        className="mx-0 my-3" size="lg" type="button" block
        value={stakeAmount}
        onClick={stakeButtonHandler}
        >
            Stake {stakeAmount} HEX<br/>for 5555 days!
        </Button>
    )
}
  
class StakeForm extends React.Component {

  constructor(props) {
    super(props)
    this.parent = props.parent
    this.hex = this.parent.hex
    this.state = {
      stakeAmount: "",
    }
  }

  render() {
    const { hearts } = this.parent.state
    const { stakeAmount } = this.state
    const hexBalance = BN(hearts).div(1E08).toFixed(4)

    const percentButtonHandler = (e) => {
      const stakeAmount = BN(e.target.value).times(hexBalance).div(100).toFixed(4)
      this.setState({ stakeAmount })
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
              onChange={e => this.setState({ stakeAmount: e.target.value })}
            />
          </Col>
        </Form.Group>
        <Form.Row>
          <Col className="mt-1">
            <Form.Group className="percent-btns" controlId="amountSelector">
              <Button variant="danger" onClick={percentButtonHandler} value="10">10%</Button>
              <Button variant="warning" onClick={percentButtonHandler} value="25">25%</Button>
              <Button variant="warning" onClick={percentButtonHandler} value="50">50%</Button>
              <Button variant="info" onClick={percentButtonHandler} value="75">75%</Button>
              <Button variant="success" onClick={percentButtonHandler} value="100">100%</Button>
            </Form.Group>
          </Col>
        </Form.Row>
        <Form.Row>
          <Col><StakeButton parent={this} /></Col>
        </Form.Row>
      </Form>
    </>)
  }
}

export default StakeForm