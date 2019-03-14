import "./styles.scss";
import * as d3 from 'D3';
import { QueryObject, VariantObject } from "./queryObject";
import { searchOMIM } from "./search";
const gCanvas = require('./graphRender');
var neoAPI = require('./neo4jLoader');
var search = require('./search');
var dataLoad = require('./fileDataLoad');
const qo = require('./queryObject');
import ky from 'ky';



d3.select('.search-icon').on('click', () => {
    const value = (document.getElementById('search-bar')).value;
    let dataOb = new qo.QueryObject(value);
    neoAPI.checkForNode(value).then(found => {
        if (found.length > 0) {
            console.log("already exists");
        } else {
            neoAPI.addToGraph(value, 'Gene');
        }
        search.searchBySymbol(dataOb).then(() => neoAPI.getGraph().then(g => gCanvas.drawGraph(g)));

    });
});

let canvas = d3.select('#graph-render').append('svg').classed('graph-canvas', true);
let linkGroup = canvas.append('g').classed('links', true);
let nodeGroup = canvas.append('g').classed('nodes', true);
let toolDiv = d3.select('body').append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
let queryPanel = d3.select('#wrapper').append('div').attr('id', 'query-panel');

dataLoad.loadFile().then(d=> {
  //  dataLoad.renderSidebar(d);
    let dataOb = new qo.QueryObject(d[0].key);
    dataOb.type = "Gene";
    let varArray = d[0].values.map(v=> {
        let variant = new qo.QueryObject(v.id);
        variant.type = "Variant";
        Object.keys(v).map(key=> {
            variant.properties[key.toString()] = v[key];
            variant.Gene = d[0].key;
            variant.description = variant.name;
            variant.name = variant.dbSnps;
        });
        return variant
    });

    neoAPI.getGraph().then(g => {
    
        if(g != undefined){

            isStored(g[0], 'GJB2', 'Gene', dataOb).then(async (nodeO)=> {
         
                gCanvas.drawGraph(g);

                let variants = g[0].nodes.filter(d=> d.label == 'Variant');
                if(variants.length == 0){
                    let vars = await qo.structVariants(nodeO);
                    neoAPI.addNodeArray(vars);
                }

                let phenotypes = g[0].nodes.filter(d=> d.label == 'Phenotype');
                if(phenotypes.length == 0){
                    let pheno = await qo.structPheno(nodeO);
                    neoAPI.addNodeArray(pheno);
                    neoAPI.structureRelation(pheno, variants, "Pheno");

                }else{
                    neoAPI.structureRelation(phenotypes, variants, "Pheno");
                }
                nodeO.properties.Variants = qo.structVariants(nodeO);
                //nodeO.properties.Phenotypes = qo.structPheno(nodeO);
            
                gCanvas.renderSidebar(nodeO);
                gCanvas.renderGeneDetail(nodeO);
            });

        }else{
         
            initialSearch(dataOb).then(n=> {
            
                neoAPI.addNode(n, n.type);
                
                qo.structVariants(n).then(async (vars)=> {
                    n.properties.Variants = vars;
    
                    neoAPI.addNodeArray(n.properties.Variants).then(async ()=> {
                        n.properties.Variants.forEach(v=>{
                            neoAPI.addRelation(v.name, v.type, n.value, n.type, 'Mutation');
                        });

                    n.properties.Phenotypes.nodes = await qo.structPheno(n);//.then(async (no) => {

                    neoAPI.addNodeArray(n.properties.Phenotypes.nodes);
                      
                    let varNames = n.properties.Variants.map(v=> {
                       // console.log('var array', v)
                        let des = typeof v.properties == 'string'? JSON.parse(v.properties) : v.properties;
                        return des.description.toString()
                    });
                   // console.log('var names',varNames);
                    let relatedPhenotypes = n.properties.Phenotypes.nodes.map(p=>{
                            let pindex = varNames.indexOf(p.properties.description.toString().toUpperCase())
                            if(pindex > -1 ){
                                p.varIds = n.properties.Variants[pindex].name;
                            }else{
                                p.varIds = null;
                            }
                            return p;
                        }).filter(p=> p.varIds != null);

                        console.log('pheno', relatedPhenotypes);
                        relatedPhenotypes.forEach(rel => {
                            neoAPI.addRelation(rel.name, 'Phenotype', rel.varIds, 'Variant', 'Pheno');
                    });

                });

            });
    
    })

    }
})

async function initialSearch(queryOb: object){

    let idSearch = await search.searchBySymbol(queryOb);
    let mimId = await search.geneIdtoMim(idSearch);
    let omimOb = await searchOMIM(mimId);
    let kegg = await search.getKegg(omimOb.properties.Ids.ncbi, omimOb);
    console.log("fin", kegg);
    return kegg;
}

async function isStored(graph: object, nameSearch:string, nodeType:string, data:object){
    let foundGraphNodes = graph.nodes.filter(n=> n.properties.symbol == nameSearch);
    let nodeOb = foundGraphNodes.length > 0 ? foundGraphNodes[0] : initialSearch(data);
    console.log('nodeOb', nodeOb)
    neoAPI.addNode(nodeOb, nodeType);
    return nodeOb
}

});