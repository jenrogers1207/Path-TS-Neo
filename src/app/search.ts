import * as d3 from 'D3';

const qo = require('./queryObject');
const neoAPI = require('./neo4jLoader');
const gCanvas = require('./graphRender');

const got = require('got');
import ky from 'ky';
import { SrvRecord } from 'dns';


const queryKeeper = new qo.QueryKeeper();

export async function searchBySymbol(query:object) {

    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'http://mygene.info/v3/query?q=';

    let req =  await got(proxy+'http://mygene.info/v3/query?q='+query.value);
  
    let json = JSON.parse(req.body);

    let idSearch = json.hits[0];
   
    let ids = { 'symbol': idSearch.symbol, 'ncbi': idSearch._id, 'entrezgene': idSearch.entrezgene, 'taxid': idSearch.taxid, 'description': idSearch.name };
    query.properties.Ids = ids
    query.properties.Description = idSearch.name;
    return query;
  // return props;
    
}

export async function loadSNP(value: string){
 
    let digits = value.replace(/\D/g,'');
    let proxy = 'https://cors-anywhere.herokuapp.com/';
    //let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+digits+'&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
   // 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=328931&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
    let url = 'https://api.ncbi.nlm.nih.gov/variation/v0/beta/refsnp/' + digits;
    let req = await ky.get(proxy + url).json();
    neoAPI.setNodeProperty('Variant', value, 'snpProps', JSON.stringify(req.primary_snapshot_data))
    
    return await Promise.resolve(req.primary_snapshot_data);
}

export async function searchOMIM(queryOb:any){

    let searchValue = queryOb.properties.Ids.MIM
    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = "https://api.omim.org/api/entry?mimNumber="+searchValue+"&include=text&include=allelicVariantList&include=clinicalSynopsis&include=referenceList&include=geneMap&format=json&apiKey=mUYjhLsCRVOuShEhrHLG_w";
    let req =  await got(proxy+url);
    let json = JSON.parse(req.body);

    let omim = json.omim.entryList[0].entry;

    /*
    queryOb.properties.allelicVariantList = props.allelicVariantList.map(p=> p['allelicVariant']);
 
    queryOb.properties.titles = props.titles;
    queryOb.properties.geneMap = props.geneMap;
    queryOb.properties.referenceList = props.referenceList.map(p=> p.reference);
    queryOb.properties.text = props.textSectionList.map(p=> p.textSection);

    return queryOb;
    */

        /*
    chromosome: 13
    chromosomeLocationEnd: 20192974
    chromosomeLocationStart: 20187462
    chromosomeSort: 15
    chromosomeSymbol: "13"
    computedCytoLocation: "13q12.11"
    confidence: "C"
    cytoLocation: "13q11-q12"*/

    //add these more dynamically
    queryOb.properties.Variants = omim.allelicVariantList.map(p=> p['allelicVariant']);
    queryOb.properties.Titles = omim.titles;

    queryOb.properties.Location = 
    {'chromosome':omim.geneMap.chromosome, 
    'chromosomeStart':omim.geneMap.chromosomeLocationStart, 
    'chromosomeEnd':omim.geneMap.chromosomeLocationEnd,
    'chromosomeSort': omim.geneMap.chromosomeSort,
    'computedCytoLocation': omim.geneMap.computedCytoLocation,
    'cytoLocation': omim.geneMap.cytoLocation
    };

    queryOb.properties.References = omim.referenceList.map(p=> p.reference);
    queryOb.properties.Text = omim.textSectionList.map(p=> p.textSection);
    queryOb.properties.Models.mouse = {'MgiID': omim.geneMap.mouseMgiID, 'symbol': omim.geneMap.mouseGeneSymbol };
    queryOb.properties.Phenotypes = omim.geneMap.phenotypeMapList;
    queryOb.properties.Ids.sequenceID = omim.geneMap.sequenceID;
    queryOb.properties.transcript = omim.geneMap.transcript;
    queryOb.properties.Titles = omim.titles
    queryOb.properties.Symbols = omim.geneMap.geneSymbols;
    queryOb.properties.Transcript = omim.geneMap.transcript;
    queryOb.properties.mappingMethod = omim.geneMap.mappingMethod;

    /*
    geneName: "Gap junction protein, beta-2, 26kD (connexin 26)"
    geneSymbols: "GJB2, CX26, DFNB1A, PPK, DFNA3A, KID, HID"
    mappingMethod: "REa, A, Fd"
    mimNumber: 121011
    mouseGeneSymbol: "Gjb2"
    mouseMgiID: "MGI:95720"
    phenotypeMapList: (7) [{…}, {…}, {…}, {…}, {…}, {…}, {…}]
    sequenceID: 10613
    transcript: "ENST00000645189.1"
*/
    console.log(queryOb);
   //return props;
   return queryOb;
}

export async function geneIdtoMim(query:any){
  
    console.log(query);
   // console.log(query.properties.ids.entrezgene);
    let value = query.properties.Ids.entrezgene;
    console.log(value);
  
    const proxy = 'https://cors-anywhere.herokuapp.com/';

    let url = 'http://mygene.info/v2/gene/'+value+'?fields=MIM';
          
    let req =  await got(proxy+url);
    
    let json = JSON.parse(req.body);

    let props = json;

    query.properties.Ids.MIM = props.MIM;
    
    return query;
    //return props;

}
export async function getKegg(value: string, queryOb:object){
  
   // let ncbi = queryOb.properties.ncbi;
    let req =  await ky.get('https://cors-anywhere.herokuapp.com/http://rest.kegg.jp/conv/genes/ncbi-geneid:'+value).text();
  
    let parsed = req.split(/(\s+)/).filter(d=> d.includes('hsa'));

    let req2 =  await ky.get('https://cors-anywhere.herokuapp.com/http://rest.kegg.jp/get/'+parsed[0]).text();

    let data = req2.split(/\r?\n/)
    data.map(d=> d.split(' '));
  
    function testRec(oldIndex, dataArray){
        let key = [];
        let keyIndex = oldIndex;
        let test = []
        
        dataArray.forEach((ob, i)=> {
            if(ob.startsWith(' ')){
                key.push(ob)//.filter(o=> o != ""))
            }else{
                key = [ob]//.filter(o=> o != "")
                keyIndex = i
                test.push(key);
            }
        });

        let newData = test.map(row=> {
            let keyz = row[0].split(/\b/)[0];
            let val = row.map(r=> r.split(/\s+/).filter(f=> f != "" && f != keyz))
            return {key: keyz, values: val}
        });

      //  console.log(newData.filter(n=> n.key != "///" && n.key != ""));
        return newData.filter(n=> n.key != "///" && n.key != "");
    }
    queryOb.properties.kegg = await testRec(0, data);
    return queryOb;
}

export async function linkData(ob1, ob2){
  //  console.log(ob1);
  //  console.log(ob2);

    let namesToMatch = ob1.map(p=> {
        p.phenotype.toUpperCase()
    });
    let namesToCheck = ob2.map(v=> v.description);

}

//Formater for CONVERT. Passed as param to query
export async function getPathways(queryOb) {
    //console.log(queryOb);
   // console.log(queryOb.properties.titles.preferredTitle.contains('PRROTEIN'))

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