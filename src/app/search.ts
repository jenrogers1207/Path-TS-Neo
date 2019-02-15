import * as d3 from 'D3';

const qo = require('./queryObject');
const neoAPI = require('./neo4jLoader');
const gCanvas = require('./graphRender');

const got = require('got');

const queryKeeper = new qo.QueryKeeper();

export async function searchBySymbol(queryOb:object) {

    let query = queryOb;
    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'http://mygene.info/v3/query?q=';

    let req =  await got(proxy+'http://mygene.info/v3/query?q='+query.value);
  
    let json = JSON.parse(req.body);

    let props = json.hits[0];
    let properties = { 'symbol': props.symbol, 'ncbi': props._id, 'entrezgene': props.entrezgene, 'description': props.name };
              
    query.properties = properties
    /*
    neoAPI.checkForNode(value).then(found => {
    if (found.length > 0) {
        for (let prop in properties) {
            neoAPI.setNodeProperty(value, prop, properties[prop]);
            }
            };
    });

    convert_id(query);
        */

    return query;
    
}

export async function geneIdtoMim(queryOb:any){
    let query = queryOb;
    console.log(query.properties.entrezgene);
    let value = query.properties.entrezgene;
    console.log(value);
    const proxy = 'https://cors-anywhere.herokuapp.com/';

    let url = 'http://mygene.info/v2/gene/'+value+'?fields=MIM';
          
    let req =  await got(proxy+url);
    console.log(req);
    let json = JSON.parse(req.body);

    let props = json;

    console.log(json)
           
    query.properties.MIM = props.MIM;
    console.log(props);
    console.log("query with property", query);
           
    return query;
}

//Formater for CONVERT. Passed as param to query
async function convert_id(queryOb) {
    //NEED TO MAKE THIS SO IT CAN USE OTHER IDS
    let stringArray = new Array();
    let type = 'genes/';
    let url = 'http://rest.kegg.jp/conv/' + type + 'ncbi-geneid:' + queryOb.ncbi;

    const proxy = 'https://cors-anywhere.herokuapp.com/';

    return xhr({
            url: proxy + url,
            method: 'GET',
            encoding: undefined,
            headers: {
                "Content-Type": "text/plain"
            }
        },
        function done(err, resp, body) {
            if (err) {
                console.error(err);
                return;
            }

            // v this consoles what I want v 
            grabId(queryOb, resp.rawRequest.responseText).then(ids => {
                linkData(queryOb, ids);
            });

            return resp;
        }

    );

}


function get_format(id, geneId) {
    let url = 'http://rest.kegg.jp/get/' + id + '/kgml';
    let proxy = 'https://cors-anywhere.herokuapp.com/';

    let data = xhr({
            url: proxy + url,
            method: 'GET',
            encoding: undefined,
            headers: {
                "Content-Type": "application/json"

            }
        },
        function done(err, resp, body) {

            if (err) {
                console.error(err);
                return;
            }

        });
}



//Formater for CONVERT. Passed as param to query
function conv_format(id) {
    //NEED TO MAKE THIS SO IT CAN USE OTHER IDS
    let stringArray = new Array();
    let type = 'genes/';
    let url = 'http://rest.kegg.jp/conv/' + type + id;

    let proxy = 'https://cors-anywhere.herokuapp.com/';

    let data = xhr({
            url: proxy + url,
            method: 'GET',
            encoding: undefined,
            headers: {
                "Content-Type": "text/plain"
            }
        },

        function done(err, resp, body) {
            if (err) {
                console.error(err);
                return;
            }

            // v this consoles what I want v 
            grabId(null, resp.rawRequest.responseText).then(ids => link_format(ids));

            return resp;
        }

    );

    return data;
}

async function grabId(query, list) {
    let stringArray = new Array();

    list = list.split(/(\s+)/);

    for (var i = 0; i < list.length; i++) {
        if (list[i].length > 1) {
            stringArray.push(list[i]);
        }
    };

    return stringArray;
}

function renderText(idArray, response) {

    let splits = grabId(null, response);
    let id_link = splits[0];
    splits = splits.filter(d => d != id_link);

    let divID = d3.select(document.getElementById('gene-id'));
    divID.selectAll('*').remove();

    let divLink = d3.select(document.getElementById('linked-pathways'));
    divLink.selectAll('*').remove();

    divLink.append('div').append('h2').text('Associated Pathways: ');
    if (idArray.length > 1) {
        divID.append('span').append('text').text('Search ID:');
        divID.append('text').text(idArray[0] + '   ');

    }
    divID.append('span').append('text').text('Kegg ID:');
    divID.append('text').text(id_link);

    let div = divLink.selectAll('div').data(splits);
    div.exit().remove();
    let divEnter = div.enter().append('div').classed('path-link', true);
    div = divEnter.merge(div);

    let text = divEnter.append('text').text(d => d);
    text.on('click', (id) => get_format(id, id_link));

}

//Formater for LINK. Passed as param to query
function link_format(idArray) {
    let keggId = null;

    keggId = (idArray.length > 1) ? idArray[1] : idArray[0];

    let url = 'http://rest.kegg.jp/link/pathway/' + keggId;
    let proxy = 'https://cors-anywhere.herokuapp.com/';

    let data = xhr({
            url: proxy + url,
            method: 'GET',
            encoding: undefined,
            headers: {
                "Content-Type": "text/plain"
            }
        },
        function done(err, resp, body) {
            if (err) {
                console.error(err);
                return;
            }


            return resp;
        }

    );


    return data;

}

//Formater for LINK. Passed as param to query
async function linkData(queryOb, idArray) {

    let keggId = (idArray.length > 1) ? idArray[1] : idArray[0];

    let url = 'http://rest.kegg.jp/link/pathway/' + keggId;
    const proxy = 'https://cors-anywhere.herokuapp.com/';

    let data = xhr({
            url: proxy + url,
            method: 'GET',
            encoding: undefined,
            headers: {
                "Content-Type": "text/plain"
            }
        },
        await
        function(err, resp, body) {
            if (err) {
                console.error(err);
                return;
            }

            let splits = grabId(queryOb, resp.rawRequest.responseText).then(d => {

                let id_link = d[0];
                let splits = d.filter(d => d != id_link);

                splits.map(path => {

                    neoAPI.addToGraph(path, 'Pathway').then(neoAPI.addRelation(queryOb.name, path).then(() => neoAPI.getGraph().then(g => gCanvas.drawGraph(g))));
                });
            });

            return resp;
        }
    );

    return data;

}