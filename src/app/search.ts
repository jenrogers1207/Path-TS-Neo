import * as d3 from 'D3';

const qo = require('./queryObject');
const neoAPI = require('./neo4jLoader');
const gCanvas = require('./graphRender');

const got = require('got');
import ky from 'ky';
import { SrvRecord } from 'dns';


export async function addGene(d: object){

    let geneOb = new qo.GeneObject(d.name, 'Gene');

    let newNode = await initialSearch(geneOb);
   
    return newNode;
}

export async function initialSearch(queryOb: object){
   
    let idSearch = await searchBySymbol(queryOb);
    let mimId = await geneIdtoMim(idSearch);
    let omimOb = await searchOMIM(mimId);
    let kegg = await getKegg(omimOb.properties.Ids.ncbi, omimOb);
    let interact = await searchStringInteractors(kegg);
    return interact;
}

export async function searchBySymbol(query:object) {

    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'http://mygene.info/v3/query?q=';

    let req =  await got(proxy+'http://mygene.info/v3/query?q='+query.name);
  
    let json = JSON.parse(req.body);

    let idSearch = json.hits[0];
   
    let ids = { 'symbol': idSearch.symbol, 'ncbi': idSearch._id, 'entrezgene': idSearch.entrezgene, 'taxid': idSearch.taxid, 'description': idSearch.name };
    query.properties.Ids = ids
    query.properties.Description = idSearch.name;

    return query;
  // return props;
    
}

export async function searchUniprot(value:string){
    //P29033
    let proxy = 'https://cors-anywhere.herokuapp.com/';
    //let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+digits+'&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
   // 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=328931&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
    let url = 'https://www.uniprot.org/uniprot/'+value+'.xml';

   // let req = await ky.get(url);
   let req =  await got(proxy+url);

}

export async function loadSNP(value: string){
    
    let query = value.includes(',') ? value.split(',')[0] : value;
    let digits = query.replace(/\D/g,'');
    let proxy = 'https://cors-anywhere.herokuapp.com/';
    //let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id='+digits+'&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
   // 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=328931&retmode=json&apiKey=mUYjhLsCRVOuShEhrHLG_w'
    let url = 'https://api.ncbi.nlm.nih.gov/variation/v0/beta/refsnp/' + digits;

    let response = (async () => {
        try {
            let req = await ky.get(url).json();
            let resp = req.primary_snapshot_data;
            resp.refsnp_id = req.refsnp_id;
            return resp;
        } catch (error) {
            let req = null;
            return req;
        }
    });

    return await response();
}

export async function loadEnsemble(value:string){
    let query = value.includes(',') ? value.split(',')[0] : value;
    let proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'https://rest.ensembl.org/variation/human/'+query+'?content-type=application/json';
    let response = (async () => {
        try {
            let req = await ky.get(url).json();
            return req;
        } catch (error) {
            let req = null;
            return req;
        }
    });

    return await response();
    
}

export async function searchOMIM(queryOb:any){

    let searchValue = queryOb.properties.Ids.OMIM
    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = "https://api.omim.org/api/entry?mimNumber="+searchValue+"&include=text&include=allelicVariantList&include=clinicalSynopsis&include=referenceList&include=geneMap&format=json&apiKey=mUYjhLsCRVOuShEhrHLG_w";
    let req =  await got(proxy+url);
    let json = JSON.parse(req.body);

    let omim = json.omim.entryList[0].entry;

    console.log('omim',omim);

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
    queryOb.properties.Phenotypes.nodes = omim.geneMap.phenotypeMapList;
    queryOb.properties.Ids.sequenceID = omim.geneMap.sequenceID;
    queryOb.properties.transcript = omim.geneMap.transcript;
    queryOb.properties.Titles = omim.titles
    queryOb.properties.Symbols = omim.geneMap.geneSymbols;
    queryOb.properties.Transcript = omim.geneMap.transcript;
    queryOb.properties.mappingMethod = omim.geneMap.mappingMethod;

   return queryOb;
}
export async function geneIdtoMim(query:any){
 
    let value = query.properties.Ids.entrezgene;

    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'http://mygene.info/v2/gene/'+value+'?fields=MIM';
          
    let req =  await got(proxy+url);
    let json = JSON.parse(req.body);
    let props = json;
    query.properties.Ids.OMIM = props.MIM;
    
    return query;
    //return props;
}

export async function searchStringInteractors(node:object){

    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'https://string-db.org/api/json/interaction_partners?identifiers='+ node.name +'&limit=20';
    let req =  await ky.get(proxy+url).json();

    node.properties.Ids.stringID = req[0].stringId_A;
               
    let interactionNodes = req.map(m => {
        let ob = {'name' : m.preferredName_B, 'type': 'Interaction', 'properties': { 'Ids': {}, 'Metrics': {} } };
        ob.properties.Ids.stringID = m.stringId_B;
        ob.properties.Source = m.preferredName_A;
        ob.properties.Metrics = d3.entries(m).filter(f=> f.key.includes('score'))
        return ob;
    });

    node.properties.InteractionPartners = interactionNodes;


    return node;
}

export async function searchStringEnrichment(value:string){

    const proxy = 'https://cors-anywhere.herokuapp.com/';
    let url = 'https://string-db.org/api/json/enrichment?identifiers='+value;

    let url2 = 'http://string-db.org/api/json/network?identifier=gjb2&limit=10&network_flavor=evidence%20Additional%20information%20about%20the%20API'

    let req =  await ky.get(proxy+url).json();
    let req2 = await ky.get(proxy+url2).json();                                                                                                                 

    return req;
}

export async function getKegg(value: string, queryOb:object){
  
   // let ncbi = queryOb.properties.ncbi;
    let req =  await ky.get('https://cors-anywhere.herokuapp.com/http://rest.kegg.jp/conv/genes/ncbi-geneid:'+value).text();
  
    let parsed = req.split(/(\s+)/).filter(d=> d.includes('hsa'));

    let req2 =  await ky.get('https://cors-anywhere.herokuapp.com/http://rest.kegg.jp/get/'+parsed[0]).text();

    let data = req2.split(/\r?\n/)
    data.map(d=> d.split(' '));
  
    function structureResponseData(oldIndex, dataArray){
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

        return newData.filter(n=> n.key != "///" && n.key != "");
    }

    let keggData = await structureResponseData(0, data);

    console.log('keggData',keggData);

    if(keggData.filter(d=> d.key == "DISEASE").length > 0){

        let diseases = keggData.filter(d=> d.key == "DISEASE").map(f=> f.values)[0];

        let matchDis = diseases.map(d=> {
            let keggId = d[0];
            let stringId = [];
            for(let i = 1; i < d.length; i++){
                stringId.push(d[i]);
            }
            return {'keggId': keggId, 'stringId': stringId};
        });

        queryOb.properties.Phenotypes.keggIDs = matchDis;
    }
    

    let keggOrthoID = keggData.filter(d=> d.key == "ORTHOLOGY").map(f=> f.values)[0];
    let keggBrite = keggData.filter(d=> d.key == "BRITE").map(f=> f.values)[0];
    let dbLinks = keggData.filter(d=> d.key == "DBLINKS").map(f=> f.values)[0];
    let AASEQ = keggData.filter(d=> d.key == "AASEQ").map(f=> f.values)[0];
    let NTSEQ = keggData.filter(d=> d.key == "NTSEQ").map(f=> f.values)[0];
    let STRUCTURE = keggData.filter(d=> d.key == "STRUCTURE").map(f=> f.values)[0];
    let MOTIF = keggData.filter(d=> d.key == "MOTIF").map(f=> f.values)[0];

    dbLinks.map(d=> {
        let key = d[0].slice(0, -1);
        let value = d[1];
        return {'key': key, 'value': value};
    }).forEach(el => {
        queryOb.properties.Ids[el.key] = el.value;
    });

    
    queryOb.properties.Orthology.keggID = keggOrthoID[0][0]
    queryOb.properties.Brite.kegg = keggBrite;
    queryOb.properties.Structure.AASEQ = AASEQ;
    queryOb.properties.Structure.NTSEQ = NTSEQ;
    queryOb.properties.Structure.ids = STRUCTURE;
    queryOb.properties.Structure.MOTIF = MOTIF;

    queryOb.properties.Brite = queryOb.properties.Brite.kegg.map(b=>{
        if(b[0].match(/\d/)){
            let tag = b.slice(1, (b.length))
            if(tag.length > 1){
                return {'id': b[0], 'tag': tag.reduce((a, c)=> a.concat(' '+c)) }
            }else{return {'id': b[0], 'tag': tag } }
            
        }else{
            let tag = b.slice(0, (b.length - 1));
            if(tag.length > 1){
                return {'id': b[b.length - 1], 'tag': tag.reduce((a, c)=> a.concat(' '+c)) }
            }else{return {'id': b[0], 'tag': tag } }
        }
    });


    return queryOb;
}

export async function linkData(ob1, ob2){

    let namesToMatch = ob1.map(p=> {
        p.phenotype.toUpperCase()
    });
    let namesToCheck = ob2.map(v=> v.description);

}

//Formater for CONVERT. Passed as param to query
export async function getPathways(queryOb) {

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
