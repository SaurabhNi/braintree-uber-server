// server

var http = require('http');
var path = require('path');
var braintree = require('braintree');
var gateway = braintree.connect({environment: braintree.Environment.Production,
	//merchantId: "tywncdswf825nrc9",
	//publicKey: "crhds8qwnxhjt9wv",
	//privateKey: "7c8a8aeea3a710d8312d3f669530b6e6"
	//accessToken: 'access_token$sandbox$twqz54969tjcvnzb$135fdf7d7c6d230b586fe0a8dcf647a4'
	accessToken: 'access_token$sandbox$cmsjrxqjrjzbcz2r$3ea9b37593fb87eccaa70d92ddf6babf'
	//accessToken: 'access_token$production$t2kz2xvnj6qz54cr$c74d08d4cd2a22d24146cdfc62f5489f'
});

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var request = require("request");
var bodyParser = require('body-parser');
var returnCapture= require('./returnCapture.js');

var router = express();
router.use(bodyParser.json());
var server = http.createServer(router);


router.use(express.static(path.resolve(__dirname, 'client')));
router.use('/return',returnCapture);
var messages = [];
var sockets = [];



const config = require('./config');
const payLoadTemplate = require('./payload_template')
const products = require('./products');

const configuration = config.getConfig();
const createPaymentPayloadTemplates = payLoadTemplate.getCreatePaymentsPayloadTemplate();
const btPaymentRequestPayLoadTemplate = payLoadTemplate.getCreateBTPaymentsPayLoadTemplate();
const productsJson = products.getProductsTemplate()


function getAccessToken(cb) {
	
	var url = configuration.ACCESS_TOKEN_URL;
	var token  = configuration.CLIENT_ID+":"+configuration.SECRET,
	    encodedKey = new Buffer(token).toString('base64'),
	    payload = "grant_type=client_credentials&Content-Type=application%2Fx-www-form-urlencoded&response_type=token&return_authn_schemes=true",
	    headers = {
			'authorization': "Basic "+encodedKey,
			'accept': "application/json",
			'accept-language': "en_US",
			'cache-control': "no-cache",
			'content-type': "application/x-www-form-urlencoded",
			'PayPal-Partner-Attribution-Id' : configuration.BN_CODE
			}

			var options = { 
			  method: 'POST',
			  url: configuration.ACCESS_TOKEN_URL,
			  headers: {
							'authorization': "Basic "+encodedKey,
							'accept': "application/json",
							'accept-language': "en_US",
							'cache-control': "no-cache",
							'content-type': "application/x-www-form-urlencoded",
							'PayPal-Partner-Attribution-Id' : configuration.BN_CODE
						},
				body:payload
			}

			request(options, function (error, response, body) {
			  if (error) {
			  	throw new Error(error);
			  }
			  else{
			  	cb(body)
			  }
			});
		}

function buildCreatePaymentPayload(data) {
	var template = createPaymentPayloadTemplates;
		template.transactions[0].amount.total = data.total
		template.transactions[0].amount.currency = data.currency
		
		template.transactions[0].amount.details.subtotal = data.subtotal
		template.transactions[0].amount.details.shipping_discount = data.shipping_discount
		template.transactions[0].amount.details.insurance = data.insurance
		template.transactions[0].amount.details.shipping = data.shipping
		template.transactions[0].amount.details.tax = data.tax
		template.transactions[0].amount.details.handling_fee = data.handling_fee

		template.transactions[0].invoice_number = makeid();

		template.transactions[0].item_list.items[0].name = data.description	
		template.transactions[0].item_list.items[0].description = data.description	
		template.transactions[0].item_list.items[0].quantity = data.quantity	
		template.transactions[0].item_list.items[0].price = data.price	
		template.transactions[0].item_list.items[0].tax = data.tax	
		template.transactions[0].item_list.items[0].currency = data.currency	



		template.redirect_urls.return_url = configuration.RETURN_URL
		template.redirect_urls.cancel_url = configuration.CANCEL_URL
		
		if(data.customFlag == "true") {
			template.transactions[0].item_list.shipping_address.recipient_name = data.recipient_name	
			template.transactions[0].item_list.shipping_address.line1 = data.line1
			template.transactions[0].item_list.shipping_address.line2 = data.line2
			template.transactions[0].item_list.shipping_address.city = data.city
			template.transactions[0].item_list.shipping_address.country_code = data.country_code
			template.transactions[0].item_list.shipping_address.postal_code = data.postal_code
			template.transactions[0].item_list.shipping_address.phone = data.phone
			template.transactions[0].item_list.shipping_address.state = data.state			
		}else {
			delete template.transactions[0].item_list['shipping_address'];
		}


	return template;

}

function buildbtPaymentRequestPayload(data) {
	console.log(data);
	var template = btPaymentRequestPayLoadTemplate;
		template.amount = data.total;
		template.merchantAccountId = data.currency;
		
		//template.transactions[0].amount.details.subtotal = data.subtotal
		//template.transactions[0].amount.details.shipping_discount = data.shipping_discount
		//template.transactions[0].amount.details.insurance = data.insurance
		//template.transactions[0].amount.details.shipping = data.shipping
		//template.transactions[0].amount.details.tax = data.tax
		//template.transactions[0].amount.details.handling_fee = data.handling_fee

		template.orderId = makeid();

		//template.descriptor.name = data.description	
		//template.transactions[0].item_list.items[0].description = data.description	
		//template.transactions[0].item_list.items[0].quantity = data.quantity	
		//template.transactions[0].item_list.items[0].price = data.price	
		//template.transactions[0].item_list.items[0].tax = data.tax	
		//template.transactions[0].item_list.items[0].currency = data.currency	



		//template.redirect_urls.return_url = configuration.RETURN_URL
		//template.redirect_urls.cancel_url = configuration.CANCEL_URL
		
		if(data.customFlag == "true") {
			template.shipping.firstName = data.recipient_name	
			// template.transactions[0].item_list.shipping_address.line1 = data.line1
			// template.transactions[0].item_list.shipping_address.line2 = data.line2
			// template.transactions[0].item_list.shipping_address.city = data.city
			// template.transactions[0].item_list.shipping_address.country_code = data.country_code
			// template.transactions[0].item_list.shipping_address.postal_code = data.postal_code
			// template.transactions[0].item_list.shipping_address.phone = data.phone
			// template.transactions[0].item_list.shipping_address.state = data.state			
		}else {
			//delete template.transactions[0].item_list['shipping_address'];
		}


	return template;

}

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}



router.post('/create-payments', function(req, res, next) {

	try{
		
	 	var payLoad = buildCreatePaymentPayload(req.body);
	 	getAccessToken(function(data) {

			var accessToken = JSON.parse(data).access_token;
		
			var _dataToSend = {

			}
			
			var options = { 
			  method: 'POST',
			  url: configuration.CREATE_PAYMENT_URL,
			  headers : {
					'content-type': "application/json",
					'authorization': "Bearer "+accessToken,
					'cache-control': "no-cache",
					'PayPal-Partner-Attribution-Id' : configuration.BN_CODE
				},
				body: payLoad,
				json:true
				
			}
			request(options, function (error, response, body) {
			  if (error) {
			  	throw new Error(error);
			  }
			  else{
			  
			  	res.send(body);
			  }
			});
			
		});
	}catch(e) {
		console.log(e)
	}
});

router.get('/execute-payments', function(req, res, next) {

	try{
		var paymentId = req.query.paymentId;
		var payerId =  req.query.PayerID;
	
	 	var payLoad = req.body;
	 	getAccessToken(function(data) {

			var accessToken = JSON.parse(data).access_token;
			var _dataToSend = {
				"payer_id": payerId
			}
			var options = { 
			  method: 'POST',
			  url:  configuration.EXECUTE_PAYMENT_URL.replace('{payment_id}', paymentId),
			  headers : {
					'content-type': "application/json",
					'authorization': "Bearer "+accessToken,
					'cache-control': "no-cache",
					'PayPal-Partner-Attribution-Id' : configuration.BN_CODE
				},
				body: _dataToSend,
				json:true
				
			}
			
			request(options, function (error, response, body) {
			  if (error) {
			  	throw new Error(error);
			  }
			  else{
			 
			  	if(body.state = 'approved') {
			  		res.redirect('/success.html?id='+body.id+"&payerId="+body.payer.payer_info.payer_id);	
			  	}else {
			  		res.redirect('/error.html');	
			  	}
			  	
			  }
			});
			
		});
	}catch(e) {
		console.log(e)
	}
});


router.post('/get-payment-details', function(req, res, next) {

	try{
		var token = req.query.token;
		var payerId = req.query.payerID;

	 	getAccessToken(function(data) {

			var accessToken = JSON.parse(data).access_token;
		
			var options = { 
			  method: 'GET',
			  url:  configuration.GET_PAYMENT_DETAILS.replace('{payment_id}', token),
			  headers : {
					'content-type': "application/json",
					'authorization': "Bearer "+accessToken,
					'cache-control': "no-cache",
					'PayPal-Partner-Attribution-Id' : configuration.BN_CODE
				}
				
			}
			
			request(options, function (error, response, body) {
			  if (error) {
			  	throw new Error(error);
			  }
			  else{
			  	//console.log("Response sent")
			  	res.send(body);
			  }
			});
			
		});
	}catch(e) {
		console.log(e)
	}
});


router.get('/get-products', function(req, res, next) {
	res.send(productsJson.products);
  	
});

router.get("/client_token", function (req, res) {
	gateway.clientToken.generate({}, function (err, response) {
	  console.log("Token generated is"+response.clientToken);	
	  res.send(response.clientToken);
	});
  });

router.post("/checkout", function (req, res) {
	var nonce = req.body.payment_method_nonce;
	console.log(nonce);
	var payLoad = buildbtPaymentRequestPayload(req.body);
	payLoad.paymentMethodNonce = nonce;
	payLoad.options.storeInVaultOnSuccess = true;
	//payLoad.deviceData = req.body.deviceData;
	console.log(payLoad);

	gateway.transaction.sale(payLoad, function (err, result) {
		if (err) {
			console.log("Inside error stream");
			console.log(err.type); 
   			console.log(err.name); 
    		console.log(err.message);
			res.send("<h1>Error:  " + err + "</h1>");
		} else if (result.success) {
		  console.log("Inside success. Transaction ID is :"+result.transaction.id);
		  console.log("Result is : "+JSON.stringify(result));
		  console.log("PayPal paymentID is :"+result.transaction.paypal.paymentId);
		  console.log("Customer ID is :",result.customer.id);
		  console.log("Customer Payment Method Token is :",result.customer.paymentMethods[0].token);
		  res.send("<h1>Success! Transaction ID: " + result.customer.id + "</h1>");
		} else {
		  console.log("Inside result is false");
		  console.log("Result is : "+JSON.stringify(result));
		  console.log("Result transaction id is : "+result.transaction.id);
		  var deepErrors = result.errors.deepErrors();
		  for (var i in deepErrors) {
			if (deepErrors.hasOwnProperty(i)) {
			  console.log(deepErrors[i].attribute);
			  console.log(deepErrors[i].code);
			  console.log(deepErrors[i].message);
			}
		  }	
		  console.log("Error is :"+result.message);
		  res.send("<h1>Error:  " + result.transaction.id + "</h1>");
		}
	  });
});


router.post("/baCheckout", function (req, res) {
	var customerID = req.body.customerID;
	console.log(customerID);
	var payLoad = buildbtPaymentRequestPayload(req.body);
	//payLoad.paymentMethodNonce = nonce;
	payLoad.customerId=customerID;
	//payLoad.deviceData=req.body.deviceData;
	//payLoad.deviceData = req.body.deviceData;
	console.log(payLoad);

	gateway.transaction.sale(payLoad, function (err, result) {
		if (err) {
			console.log("Inside error stream");
			console.log(err.type); 
   			console.log(err.name); 
    		console.log(err.message);
			res.send("<h1>Error:  " + err + "</h1>");
		} else if (result.success) {
		  console.log("Inside success. Transaction ID is :"+result.transaction.id);
		  console.log("Result is : "+JSON.stringify(result));
		  console.log("PayPal paymentID is :"+result.transaction.paypal.paymentId);
		  res.send("<h1>Success! Transaction ID: " + result.transaction.id + "</h1>");
		} else {
		  console.log("Inside result is false");
		  console.log("Result is : "+JSON.stringify(result));
		  console.log("Result transaction id is : "+result.transaction.id);
		  var deepErrors = result.errors.deepErrors();
		  for (var i in deepErrors) {
			if (deepErrors.hasOwnProperty(i)) {
			  console.log(deepErrors[i].attribute);
			  console.log(deepErrors[i].code);
			  console.log(deepErrors[i].message);
			}
		  }	
		  console.log("Error is :"+result.message);
		  res.send("<h1>Error:  " + result.transaction.id + "</h1>");
		}
	  });
});


router.post("/basetup", function (req, res) {
	var nonce = req.body.payment_method_nonce;
	console.log(nonce);
	//var payLoad = buildbtPaymentRequestPayload(req.body);
	//payLoad.paymentMethodNonce = nonce;
	//payLoad.deviceData = req.body.deviceData;
	//console.log(payLoad);

	gateway.customer.create({
		firstName: "Saurabh",
		lastName: "Nigam",
		paymentMethodNonce: nonce
	  }, function (err, result) {
		
		if(result.success)
		{
			// customer is successfully vaulted
			console.log("Customer ID is :",result.customer.id);
			console.log("Customer Payment Method Token is :",result.customer.paymentMethods[0].token);
			res.send("<h1>Success! Transaction ID: " + result.customer.id + "</h1>");
			
		// e.g 160923
	  
		
		}
		
	  });




	// gateway.transaction.sale(payLoad, function (err, result) {
	// 	if (err) {
	// 		console.log("Inside error stream");
	// 		console.log(err.type); 
   	// 		console.log(err.name); 
    // 		console.log(err.message);
	// 		res.send("<h1>Error:  " + err + "</h1>");
	// 	} else if (result.success) {
	// 	  console.log("Inside success. Transaction ID is :"+result.transaction.id);
	// 	  console.log("Result is : "+JSON.stringify(result));
	// 	  console.log("PayPal paymentID is :"+result.transaction.paypal.paymentId);
	// 	  res.send("<h1>Success! Transaction ID: " + result.transaction.id + "</h1>");
	// 	} else {
	// 	  console.log("Inside result is false");
	// 	  console.log("Result is : "+JSON.stringify(result));
	// 	  console.log("Result transaction id is : "+result.transaction.id);
	// 	  var deepErrors = result.errors.deepErrors();
	// 	  for (var i in deepErrors) {
	// 		if (deepErrors.hasOwnProperty(i)) {
	// 		  console.log(deepErrors[i].attribute);
	// 		  console.log(deepErrors[i].code);
	// 		  console.log(deepErrors[i].message);
	// 		}
	// 	  }	
	// 	  console.log("Error is :"+result.message);
	// 	  res.send("<h1>Error:  " + result.transaction.id + "</h1>");
	// 	}
	//   });
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Demo server listening at", addr.address + ":" + addr.port);
});
