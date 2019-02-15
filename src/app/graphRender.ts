import "./styles.scss";
import * as d3 from 'D3';
import * as search from './search';
import { SelectedTest, drawSelectedPanel } from './queryObject';

export function removeThings(){
    d3.select('#linked-pathways').selectAll('*').remove();
    d3.select('#pathway-render').selectAll('*').remove();
    d3.select('#assoc-genes').selectAll('*').remove();
    d3.select('#gene-id').selectAll('*').remove();
}
export function drawGraph(data: Object) {

    console.log('test to see if it loads');
    let canvas = d3.select('#graph-render').select('.graph-canvas'),
        width = +canvas.attr("width"),
        height = +canvas.attr("height"),
        radius = 20;

    // Define the div for the tooltip
    var toolDiv = d3.select('.tooltip');

    let simulation = d3.forceSimulation()
        .velocityDecay(0.1)
        .force("link", d3.forceLink().distance(80).strength(.5))
        .force("x", d3.forceX(width / 2).strength(.05))
        .force("y", d3.forceY(height / 2).strength(.05))
        .force("charge", d3.forceManyBody().strength(-80))
        .force('center', d3.forceCenter(300, 250));

    var link = canvas.select('.links')
        .selectAll(".line")
        .data(data.links);

    link.exit().remove();

    let linkEnter = link
        .enter().append("line")
        .classed('line', true)
        .attr("stroke-width", 2)
        .attr('stroke', '#9999');

    link = linkEnter.merge(link);

    let node = canvas.select('.nodes').selectAll('g').data(data.nodes);
    node.exit().remove();
    let nodeEnter = node
        .enter().append("g")
        .attr("class", d => {
            return "node " + d.label;
        });

    let circles = nodeEnter.append('circle')
        //.attr("r", radius - .75)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    let geneNode = nodeEnter.filter(d => d.label == 'gene');

    let labels = geneNode.append('text').text(d => d.title).style('color', '#ffffff').attr('x', 0)
        .attr('y', 3).attr('text-anchor', 'middle');


    node.append("title")
        .text(function(d) { return d.title; });

    node = nodeEnter.merge(node);

    node.on('click', (d) => {
        SelectedTest.queryOb = d.data;
        drawGraph(data);
    });

    node.on("mouseover", function(d) {
            toolDiv.transition()
                .duration(200)
                .style("opacity", .8);
            toolDiv.html(d.title + "<br/>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            toolDiv.transition()
                .duration(500)
                .style("opacity", 0);
        });

    let selectedNode = node.filter(d => {
      
        node.classed('selected', false);
        return SelectedTest.queryOb != null ? d.title == SelectedTest.queryOb.name : null;
    });


    selectedNode != null ? selectedNode.classed('selected', true) : console.log('no node');

    SelectedTest.queryOb != null ? drawSelectedPanel(SelectedTest.queryOb) : console.log('no code');

    simulation
        .nodes(data.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(data.links);

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(1);
        d.fx = null;
        d.fy = null;
    }

    function ticked() {
        link.attr("x1", d => {
            return d.source.x;
        }).attr("y1", d => {
            return d.source.y;
        }).attr("x2", d => {
            return d.target.x;
        }).attr("y2", d => {
            return d.target.y;
        });

        node
            .attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; });

    }

}