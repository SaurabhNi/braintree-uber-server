var express = require('express'); 
var compRouter = express(); 
var fs = require('fs'); 

compRouter.get('/',function(req,res){ 
     var data = JSON.stringify(req.body);   
     console.log("Return request from PP :",data);
     console.log("Return URL Query parameters:",req.query);
     res.send('<html><title>Onboarding completion success!!!</title><h1>PayPal Chrome Custom Tab Demo - Sucess page</h1></html>');
}); 
 
module.exports = compRouter; 
