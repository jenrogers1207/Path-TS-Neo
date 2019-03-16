import * as d3 from 'D3';
//import * as data from './testData.json';
import * as data from './testSample.json';
const qo = require('./queryObject');
//const xhr = require('nets');
const search = require('./search');


export async function loadFile(){

    let dataFixed = data.default.map(d=> d);

    let dataFiltered = dataFixed[0].overall_max_mf? dataFixed.filter(d=> d.overall_max_maf < .01) : dataFixed;

    let test = d3.nest().key(function(d) { return d.gene; })
    .entries(dataFiltered);

    return test;
}

export async function loadCalls(file){
let callTable = new qo.foundCalls();
file.default.map(call=> geneFromCP(call, callTable)).then(ct=> console.log(ct));
}

export async function geneFromCP(call, callObject){
    console.log(call);
    const proxy = 'https://cors-anywhere.herokuapp.com/';

    let url = "https://rest.ensembl.org/overlap/region/human/"+call['#chrom']+":"+call.start+"-"+call.stop+"?feature=gene;content-type=application/json"

    return xhr({
        url: proxy + url,
        method: 'GET',
        encoding: undefined,
        headers: {
            "Content-Type": "application/json"
        }
    },
    function done(err, resp, body) {

        if(resp.statusCode == 200){
            console.log(resp.body);
            let json = JSON.parse(resp.rawRequest.responseText);
            console.log(json);
        }
       // let json = JSON.parse(resp.rawRequest.responseText);
    });


}


