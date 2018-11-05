/*
Cloud Computing 2018
Peña Cervera, Débora Alejandra
NL: 27386
*/

var AWS = require('aws-sdk');

var handler = function(event, context, callback) {
  var dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10',
    endpoint: 'http://dynamodb:8000',
    region: 'us-west-2',
    credentials: {
      accessKeyId: '2345',
      secretAccessKey: '2345'
    }
  });

  var docClient = new AWS.DynamoDB.DocumentClient({
     apiVersion: '2012-08-10',
     service: dynamodb
  });

  let idEnvio = (event.pathParameters || {}).idEnvio || false;

  let id;

  let movimiento;

  switch (event.httpMethod) {
    case "GET":
      switch (event.resource) {
        case "/envios/pendientes": /*funciona bien  1-5*/
          // scan indice pendientes

          docClient.scan({
            TableName: 'Envio',
            IndexName: "EnviosPendientesIndex", 
    
          }, 

            function(err, data) {
            if (err) {
              callback(null, {
                statusCode: 500, body: JSON.stringify(err)
              });
            } else {
              callback(null, {
                statusCode: 200,
                
                body: JSON.stringify(data)

                
              })
              return;
            }
          });

          /**/
          break;
        case "/envios/{idEnvio}": /*funciona bien  2-5*/
          // get por id
        if (idEnvio) {

            docClient.get({
              TableName: 'Envio',
                  Key: { id: idEnvio} 
      
            },function(err, data) {
              if (err) {
                callback(null, {
                  statusCode: 500, body: JSON.stringify(err)
                });
              } else {
                callback(null, {
                  statusCode: 200,
                  
                  body: JSON.stringify(data)

                  
                });
                return;
              }
            });
          }
          /**/
          break;
      }
      break;
    case "POST":
      let body = JSON.parse(event.body);
      var item = body;

      switch (event.resource) {
        case "/envios":  /*funciona bien  3-5*/
          // crear
          item.fechaAlta = new Date().toISOString();
          item.pendiente = item.fechaAlta;
          item.id = guid();

          console.log('item', item);

          docClient.put({
            TableName: 'Envio',
            Item: item
          }, function(err, data) {
            if (err) {
              callback(null, {
                statusCode: 500, body: JSON.stringify(err)
              });
            } else {
              callback(null, {
                statusCode: 201,
                body: JSON.stringify(item)
              })
            }
          });

          break;
        case "/envios/{idEnvio}/movimiento":
          // agregar movimiento
          
          let idEnvio = (event.pathParameters || {}).idEnvio || false;
          
          var params = {
            TableName: "Envio",
            Limit: 10,
            Key: { "id": idEnvio }
            };
            // 1) traer por id
            docClient.get(params, function(err, data) {
              if (err) {
                console.log("error!");
                callback(null, {
                  statusCode: 500, body: JSON.stringify(err)  //error response
                });
              } else {
                 // 2) agregamos historial
                item.fecha = new Date().toISOString();
                var paramss = {
                  TableName: "Envio",
                  
                  Key: { "id": idEnvio },
                  ConditionExpression: 'attribute_exists(#pendiente)',
                  UpdateExpression: 'set #historial = list_append(if_not_exists(#historial, :empty_list), :movimiento)',
                  ExpressionAttributeNames: {
                    '#historial': 'historial',
                    '#pendiente': 'pendiente'
                  },
                  ExpressionAttributeValues: { 
                    ':movimiento': [item],
                    ':empty_list': []
                  },
                  ReturnValues: 'ALL_NEW'
                };
                // 3) put para guardar
                docClient.update(paramss, function(err, data) {
                  if (err) {
                    callback(null, {
                      statusCode: 500, body: JSON.stringify(err)
                    });
                  } else {
                    callback(null, {
                      statusCode: 201,
                      body: JSON.stringify(item)
                    });
                  }
                });
                              
                callback(null, {
                  statusCode: 201,
                  body: JSON.stringify(data) 
                });
              }
            }); 

          break;
        case "/envios/{idEnvio}/entregado":
          // marcar entregado
          // 1) traer por id
          let idseleccionado2 = (event.pathParameters || {}).idEnvio || false;
          
          var params = {
            TableName: "Envio",
            //IndexName: "EnviosPendientesIndex",
            Limit: 10,
            Key: { "id": idseleccionado2 }
            };
            docClient.get(params, function(err, data) {
              if (err) {
                console.log("error!");
                callback(null, {
                  statusCode: 500, body: JSON.stringify(err)  //error response
                });
              } else {
                // 2) borrar atributo pendiente y agregar el movimiento entregado
                var params = {
                  TableName: "Envio",
                  Key: { "id": idseleccionado2 },
                  UpdateExpression: 'set #historial = list_append(if_not_exists(#historial, :empty_list), :movimiento) remove #pendiente',
                  ExpressionAttributeNames: {
                    '#historial': 'historial',
                    '#pendiente': 'pendiente'
                  },
                  ExpressionAttributeValues: { 
                    ':movimiento': [{fecha: new Date().toISOString(),descripcion:"Entregado"}],
                    ':empty_list': []
                  },
                  ReturnValues: 'ALL_NEW'
                };
                // 3) put para guardar
                docClient.update(params, function(err, data) {
                  if (err) {
                    callback(null, {
                      statusCode: 500, body: JSON.stringify(err)
                    });
                  } else {
                    callback(null, {
                      statusCode: 201,
                      body: JSON.stringify(item)
                    });
                  }
                });
        
                callback(null, {
                  statusCode: 201,
                  body: JSON.stringify(data) 
                });
              }
            }); 

          break;
      }
      break;
    default:
      callback(null, {
        statusCode: 405
      });
  }

}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

exports.handler = handler;


