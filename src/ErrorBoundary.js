import React from 'react'
import {
    Container,
} from 'react-bootstrap'
const debug = require('debug')("EB")

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: "", errorInfo: "" }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        debug(error)
        this.setState({ error: error.message })
    }

    render() {
        if (this.state.hasError) {
            return (<>
                <Container className="p-3 bg-dark text-light">
                    <h1>Oops!</h1>
                    <h2 className="text-danger">Something went wrong.</h2>
                    <p>{this.state.error.split(/[.,:;]/)[0]}.</p>
                </Container>
            </>)
        }

        return this.props.children;
    }
}

export default ErrorBoundary
