import React, {PropTypes, Component} from "react";
import {send} from "../actions";
import {List} from "immutable";
import BigNumber from "bignumber.js";
import Send from "../components/Send";

export default class SendContainer extends Component {

    constructor() {
        super();
        this.state = {
            recipientInputError: '',
            amountInputError: '',
            amount: '', //variable for input
            amountLH: 0,
            amountFiat: '0',
            currency: '',
            currencies: '',
            currencyAlias: '',
            currenciesAlias: '',
            fee: 0,
            feeRate: 0, //is a BigNumber
            feeAlias: 0,
            aliasRate: 0, //is a BigNumber
            total: 0,
            totalAlias: 0,
            switched: false
        };
        this.recipientHandler = this.recipientHandler.bind(this);
        this.amountHandler = this.amountHandler.bind(this);
        this.send = this.send.bind(this);
        this.checkAmount = this.checkAmount.bind(this);
        this.switchAlias = this.switchAlias.bind(this);
        this.revertShowCurrency = this.revertShowCurrency.bind(this);
        this.pickCurrency = this.pickCurrency.bind(this);
    }

    componentWillMount() {
        this.pickCurrency(this.props.balances.get(0).get('symbol'));
    }

    revertShowCurrency() {
        let revert = this.state.showDropdownCurrency;
        this.setState({showDropdownCurrency: !revert})
    }


    recipientHandler(text) {
        if (text.length <= 42) {
            this.setState({recipient: text, recipientInputError: ''});
        } else {
            this.setState({
                recipient: text,
                recipientInputError: 'Address has to be 42 symbols long.'
            });
        }
    }

    checkAmount(text) {
        let balance = this.props.balances
            .find(balance => balance.get('symbol') === this.state.currency)
            .get('balance');

        if (text !== '' && isNaN(text)) {
            this.setState({amount: text, amountInputError: 'Not a number.'});
        } else if (text.startsWith('-')) {
            this.setState({amount: text, amountInputError: 'Has to be positive number.'});
        } else if (text === '') {
            this.setState({
                amount: text,
                amountInputError: '',
                amountAlias: 0,
                fee: 0,
                feeAlias: 0,
                total: 0,
                totalAlias: 0
            });
        } else if (this.state.switched) {
            let aliasBalance = new BigNumber(balance).times(this.state.aliasRate).toFixed(2).replace(/\.?0+$/, "");
            if (this.props.balances && parseFloat(text) > aliasBalance) {
                this.setState({
                    amount: text,
                    amountInputError: 'Not enough tokens on your balance.'
                });
            } else if (!/^\d*[\.]?\d{0,2}$/.test(text.replace(/\.?0+$/, ""))) {
                this.setState({
                    amount: text,
                    amountInputError: 'You can\'t send amount having more than 2 decimal places'
                });
            } else {
                return true;
            }
        } else {
            if (this.props.balances && parseFloat(text) > balance) {
                this.setState({
                    amount: text,
                    amountInputError: 'Not enough tokens on your balance.'
                });
            } else if (!/^\d*[\.]?\d{0,8}$/.test(text.replace(/\.?0+$/, ""))) {
                this.setState({
                    amount: text,
                    amountInputError: 'You can\'t send amount having more than 8 decimal places'
                });
            } else {
                return true;
            }
        }
        return false;
    }

    amountHandler(text) {
        if (this.checkAmount(text)) {
            let integer = new BigNumber(text);
            let aliasRate = this.state.aliasRate;
            let amountLH = integer;
            let amountAlias = integer.times(aliasRate).round(2);
            if(this.state.switched){
                amountLH = integer.times(new BigNumber(aliasRate).pow(-1)).round(8);
                amountAlias = integer;
            }
            let fee = integer.times(this.state.feeRate).round(8);
            if (integer.lessThan('0.000004')) {
                //Sets fee for extra-small numbers
                fee = new BigNumber('0.00000001');
            }
            let feeAlias = fee.times(aliasRate).round(2);
            let total = integer.plus(fee).round(8);
            let totalAlias = total.times(aliasRate).round(2);
            this.setState({
                amountInputError: '',
                amount: text,
                amountLH: amountLH.toString(),
                amountFiat: amountAlias.toString(),
                fee: fee.toFixed(8).replace(/\.?0+$/, ""),
                feeAlias: feeAlias.toFixed(2).replace(/\.?0+$/, ""),
                total: total.toFixed(8).replace(/\.?0+$/, ""),
                totalAlias: totalAlias.toFixed(2).replace(/\.?0+$/, "")
            });
        }
    }

    send() {
        if (this.state.recipient.length === 0) {
            this.setState({recipientInputError: 'This field is required to make send.'});
            return;
        } else if (this.state.amount.length === 0) {
            this.setState({amountInputError: 'This field is required to make send.'});
            return;
        }

        if (this.state.recipient.length !== 40 && this.state.recipient.length !== 42) {
            this.setState({recipientInputError: 'Address has to be 40 symbols long not including \'0x\' or 42 including \'0x\'.'});
            return;
        } else if (!web3.isAddress(this.state.recipient)) {
            this.setState({recipientInputError: 'Address has to be hexadecimal string. Check it has no special symbols and correct encoding.'});
            return;
        } else if (this.state.amountInputError.length > 0) {
            return;
        }

        send(this.state.recipient, this.state.amount, this.state.currency);
        this.setState({recipient: '', amount: '', amountFiat: 0});
    }

    switchAlias() {
        let switched = this.state.switched;
        this.setState({
            switched: !switched
        });
        this.amountHandler(this.state.amount);
    }

    pickCurrency(currency) {
        let currencies = [];
        let currencyAlias = '';
        let currenciesAlias = [];
        let aliasRate = 1;
        let fee = 0;
        if (this.state.switched) {
            this.props.balances.forEach((balance) => {
                if (balance.get('fiatSymbol') === currency) {
                    currencyAlias = balance.get('symbol');
                    aliasRate = new BigNumber(balance.get('fiatRate'));
                    fee = new BigNumber(balance.get('fee'));
                    return;
                }
                currencies.push(balance.get('fiatSymbol'));
                currenciesAlias.push(balance.get('symbol'));
            });
        } else {
            this.props.balances.forEach((balance) => {
                if (balance.get('symbol') === currency) {
                    currencyAlias = balance.get('fiatSymbol');
                    aliasRate = new BigNumber(balance.get('fiatRate'));
                    fee = new BigNumber(balance.get('fee'));
                    return;
                }
                currencies.push(balance.get('symbol'));
                currenciesAlias.push(balance.get('fiatSymbol'));
            });
        }
        this.setState({
            currency: currency,
            currencies: currencies,
            showDropdownCurrency: false,
            currenciesAlias: currenciesAlias,
            currencyAlias: currencyAlias,
            aliasRate: aliasRate,
            feeRate: fee
        });
    }

    render() {
        let currencyChoices = this.showDropdownCurrency();
        return (
            <Send/>
        );
    }
}

Send.propTypes = {
    balances: PropTypes.instanceOf(List).isRequired,
};
