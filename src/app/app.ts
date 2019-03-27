import "./styles.scss";
import * as d3 from 'D3';

import { searchOMIM } from "./search";
const gCanvas = require('./graphRender');
var neoAPI = require('./neo4jLoader');
var search = require('./search');
var dataLoad = require('./fileDataLoad');
const qo = require('./queryObject');
import ky from 'ky';

let canvas = d3.select('#graph-render').append('svg').classed('graph-canvas', true);
let linkGroup = canvas.append('g').classed('links', true);
let nodeGroup = canvas.append('g').classed('nodes', true);
let toolDiv = d3.select('body').append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
let queryPanel = d3.select('#wrapper').append('div').attr('id', 'query-panel');

let dropData = ['Whole Network', 'Align by Gene', 'Align by Phenotype', 'Align by Pathway']
let dropdown = d3.select('#topnav').select('.dropdown');
let dropButton = dropdown.select('.dropdown-toggle');
dropButton.text(dropData[0]);
let dropdownItems = dropdown.select('.dropdown-menu').selectAll('.dropdown-item').data(dropData);
let dropEnter = dropdownItems.enter().append('a').classed('dropdown-item', true);
dropEnter.attr('href', '#');
dropEnter.text(d=> d);
dropdownItems.merge(dropEnter);


dataLoad.loadFile().then(async (d)=> {

    let geneOb = new qo.GeneObject(d[0].key, 'Gene');
    geneOb.type = "Gene";

    let fileVariants = await variantObjectMaker(d[0].values);
    let graphArray = await neoAPI.getGraph();//.then(g => {

    if(graphArray[0].nodes.length != 0 && graphArray != undefined){
        
        let graph = graphArray[0];

        let queryGenes = graph.nodes.filter(f=> f.label.includes('Gene'));

        let queryKeeper = queryGenes.map(async (gene:object) => {
            let ob = isStored(graph, gene);
            qo.allQueries.addQueryOb(ob);
            return ob;
        });

        let graphVariants = graph.nodes.filter(d=> d.label == 'Variant');

        //adding selectednode as the file gene
        let selectedGene = await Promise.resolve(queryKeeper[0]);
        qo.selected.addQueryOb(selectedGene);
        
        let variants = await updateVariants(fileVariants, graphVariants);
        
        let variantOb = await Promise.resolve(variants);

        selectedGene.properties.Variants = variantOb;

        let graphPhenotypes = graph.nodes.filter(d=> d.label == 'Phenotype');
     
        let phenotypes = graphPhenotypes.length > 0? graphPhenotypes : await qo.structPheno(selectedGene.properties.Phenotypes, selectedGene.name);
      
        selectedGene.properties.Phenotypes = phenotypes;

      //  let enrighmentP = search.searchStringEnrichment(selectedGene.name);

        let graphInteraction = graph.nodes.filter(d=> d.label == 'Interaction');
      
        selectedGene.properties.InteractionPartners = graphInteraction.map(int=> {
            int.properties = int.properties.properties? JSON.parse(int.properties.properties) : int.properties;
            return int;
        });

      //  neoAPI.buildSubGraph(selectedGene);
        dropEnter.on('click', (d, i, g)=> {
            dropButton.text(d);
            gCanvas.graphRenderMachine(graph, [selectedGene]);
        })

        gCanvas.graphRenderMachine(graph, [selectedGene]);
        gCanvas.renderCalls(queryKeeper, [selectedGene]);
        gCanvas.renderGeneDetail([selectedGene], graph);
  
        }else{
       
            search.initialSearch(geneOb).then(async no=> {
                
                let varAlleles = await variantObjectMaker(no.properties.Variants);
                let variants = await updateVariants(fileVariants, varAlleles);
                no.properties.Variants = await Promise.all(variants);

                console.log('in app', variants);

                let structuredPheno = await qo.structPheno(no.properties.Phenotypes, no.name);
                no.properties.Phenotypes.nodes = structuredPheno;

                let enrighmentP = await search.searchStringEnrichment(no.name);
    

                neoAPI.buildSubGraph(no).then(()=> {

                    neoAPI.getGraph().then(g=> {

                        let graph = g[0];
                        gCanvas.graphRenderMachine(graph, no);
                        gCanvas.renderCalls(no);
                        gCanvas.renderGeneDetail(no, graph);
                    });
                });
        });
    }
});

export async function variantObjectMaker(varArray: Array<object>){
  
    let varObs = typeof varArray == 'string'? JSON.parse(varArray): varArray;
    
      return varObs.map(v=> {
       
          let name = v.id? v.id : v.dbSnps;
          let variant = new qo.VariantObject(name);
          variant.type = "Variant";
          
          let keys = v.properties? Object.keys(v.properties) : Object.keys(v);

          keys.map(key=> {
              variant.properties[key.toString()] = v[key];
          });

          variant.properties.associatedGene = v.gene? v.gene : null;
          variant.properties.description = variant.name;
          variant.properties.Ids.dbSnp = name;
          return variant
      });
  }

export async function isStored(graph: object, data:object){

   // let names = qo.allQueries.queryKeeper.map(k=> {return  k.name });

    let foundGraphNodes = graph.nodes.filter(n=> n.name == data.name);

    let nodeOb = foundGraphNodes.length > 0 ? labelsMatch(foundGraphNodes[0], data) : await search.initialSearch(data);

    let structuredOb = await qo.structGene(nodeOb);

    return await structuredOb;

    async function labelsMatch(graphNode:object, newNode:object){
        let type = newNode.type? newNode.type : newNode.label;
        let node = graphNode.label == type? graphNode : neoAPI.addLabel(newNode);
        return await node;
    }
}

async function updateVariants(fileVarArr:Array<Object>, graphVarArr: Array<any>){
   
    let graphVars = typeof graphVarArr == 'string'? JSON.parse(graphVarArr) : graphVarArr;
    let variantNames = graphVars.map(v=> v.name);
    let newVars = fileVarArr.filter(v=> variantNames.indexOf(v.name) == -1);

   // let unique = await findCopies(graphVars);

    let toStruct = await addIn(newVars, await findCopies(graphVars));
  //  let structured = await Promise.all(qo.structVariants(toStruct))

    return await Promise.resolve(qo.structVariants(toStruct));


    async function findCopies(nodeArray){
        let uniqueNameArray = []
        let uniqueVar = []

        await nodeArray.forEach(v => {
            if(uniqueNameArray.indexOf(v.name) == -1){
                uniqueNameArray.push(v.name);
                uniqueVar.push(v);
            }
        });
        return uniqueVar;
    }
        
    async function addIn(newArray:Array<Object>, oldArray:Array<Object>){
        if(newArray.length > 0){ newArray.forEach(v=> oldArray.push(v)) }
  
       // return qo.structVariants(oldArray);
       return oldArray;
    }

}