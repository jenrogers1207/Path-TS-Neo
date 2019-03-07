import * as d3 from 'D3';

const qo = require('./queryObject');
const neoAPI = require('./neo4jLoader');
const gCanvas = require('./graphRender');

const got = require('got');
import ky from 'ky';
import { SrvRecord } from 'dns';


const queryKeeper = new qo.QueryKeeper();

export async function searchBySymbol(queryOb:object) {

    let query = queryOb;
    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'http://mygene.info/v3/query?q=';

    let req =  await got(proxy+'http://mygene.info/v3/query?q='+query.value);
  
    let json = JSON.parse(req.body);

    let props = json.hits[0];
    let ids = { 'symbol': props.symbol, 'ncbi': props._id, 'entrezgene': props.entrezgene, 'description': props.name };
              
    query.properties.ids = ids

    return query;
    
}

export async function loadSNP(value: string){
 
    let digits = value.replace(/\D/g,'');
    let proxy = 'https://cors-anywhere.herokuapp.com/';
    //let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+digits+'&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
   // 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=328931&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
    let url = 'https://api.ncbi.nlm.nih.gov/variation/v0/beta/refsnp/' + digits;
    let req = await ky.get(proxy + url).json();
    neoAPI.setNodeProperty('Variant', value, 'snpProps', JSON.stringify(req.primary_snapshot_data))
    return req.primary_snapshot_data;
}

export async function searchOMIM(queryOb:any){

    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = "https://api.omim.org/api/entry?mimNumber="+queryOb.properties.ids.MIM+"&include=text&include=allelicVariantList&include=clinicalSynopsis&include=referenceList&include=geneMap&format=json&apiKey=mUYjhLsCRVOuShEhrHLG_w";
    let req =  await got(proxy+url);
    let json = JSON.parse(req.body);

    let props = json.omim.entryList[0].entry;
 
    //queryOb.properties.allelicVariantList = 
    queryOb.properties.allelicVariantList = props.allelicVariantList.map(p=> p['allelicVariant']);
 
    queryOb.properties.titles = props.titles;
    queryOb.properties.geneMap = props.geneMap;
    queryOb.properties.referenceList = props.referenceList.map(p=> p.reference);
    queryOb.properties.text = props.textSectionList.map(p=> p.textSection);

    return queryOb;
}

export async function geneIdtoMim(queryOb:any){
    let query = queryOb;
   // console.log(query.properties.ids.entrezgene);
    let value = query.properties.ids.entrezgene;
  
    const proxy = 'https://cors-anywhere.herokuapp.com/';

    let url = 'http://mygene.info/v2/gene/'+value+'?fields=MIM';
          
    let req =  await got(proxy+url);
    
    let json = JSON.parse(req.body);

    let props = json;

           
    query.properties.ids.MIM = props.MIM;
    
           
    return query;
}
//This is forr gettingpathway
/*
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
}*/

export async function linkData(ob1, ob2){
    console.log(ob1);
    console.log(ob2);

    let namesToMatch = ob1.map(p=> {
        p.phenotype.toUpperCase()
    });
    let namesToCheck = ob2.map(v=> v.description);

}

//Formater for CONVERT. Passed as param to query
export async function getPathways(queryOb) {
    console.log(queryOb);
    console.log(queryOb.properties.titles.preferredTitle.contains('PRROTEIN'))

    let value = queryOb.properties.ids.ncbi;


    let proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'http://rest.kegg.jp/conv/genes/ncbi-geneid:'+value;

    let req =  await ky.get('https://cors-anywhere.herokuapp.com/http://rest.kegg.jp/conv/genes/ncbi-geneid:'+value).text();

    let idstring:Array<string> = await grabId('ncbi-geneid', req);

    let keggId = null;

    keggId = (idstring.length > 1) ? idstring[1] : idstring[0];

    let url2 = 'http://rest.kegg.jp/link/pathway/' + keggId;

    let req2 =  await ky.get(proxy+ url2).text();

}
/*
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
async function getPathway(queryOb, idArray) {

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

}*/